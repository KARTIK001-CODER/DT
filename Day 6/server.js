
require("dotenv").config();

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters");
}

const users = [];
const documents = new Map();


app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password || password.length < 8) {
    return res.status(400).json({
      error: "Name, email and password (8+ chars) are required"
    });
  }

  const existing = users.find(
    user => user.email === email.toLowerCase()
  );

  if (existing) {
    return res.status(409).json({
      error: "Email already registered"
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = {
    id: crypto.randomUUID(),
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: "author"
  };

  users.push(user);

  res.status(201).json({
    message: "Account created",
    userId: user.id,
    role: user.role
  });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    item => item.email === email?.toLowerCase()
  );

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({
      error: "Invalid credentials"
    });
  }

  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "15m",
      issuer: "document-approval-api",
      audience: "document-approval-client"
    }
  );

  res.json({
    accessToken: token,
    tokenType: "Bearer",
    expiresIn: "15m"
  });
});

// Authentication middleware.
function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required"
    });
  }

  try {
    const token = header.split(" ")[1];

    req.user = jwt.verify(token, JWT_SECRET, {
      issuer: "document-approval-api",
      audience: "document-approval-client"
    });

    next();
  } catch {
    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
}

// Role-based authorization.
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({
        error: "Insufficient permissions"
      });
    }

    next();
  };
}


function requireOwner(req, res, next) {
  const document = documents.get(req.params.id);

  if (!document) {
    return res.status(404).json({
      error: "Document not found"
    });
  }

  if (document.ownerId !== req.user.sub) {
    return res.status(403).json({
      error: "You do not own this document"
    });
  }

  req.document = document;
  next();
}


app.post("/documents", authenticate, (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      error: "Title and content are required"
    });
  }

  const document = {
    id: crypto.randomUUID(),
    title,
    ownerId: req.user.sub,
    status: "draft",
    currentVersion: 1,
    versions: [
      {
        version: 1,
        content,
        createdAt: new Date().toISOString(),
        createdBy: req.user.sub
      }
    ]
  };

  documents.set(document.id, document);

  res.status(201).json(document);
});


app.put(
  "/documents/:id",
  authenticate,
  requireOwner,
  (req, res) => {
    const { content } = req.body;
    const document = req.document;

    if (document.status === "approved") {
      return res.status(409).json({
        error: "Approved documents cannot be edited"
      });
    }

    if (!content) {
      return res.status(400).json({
        error: "Content is required"
      });
    }

    const nextVersion = document.currentVersion + 1;

    document.versions.push({
      version: nextVersion,
      content,
      createdAt: new Date().toISOString(),
      createdBy: req.user.sub
    });

    document.currentVersion = nextVersion;
    document.status = "draft";

    res.json({
      message: "New version created",
      currentVersion: nextVersion
    });
  }
);

app.post(
  "/documents/:id/submit",
  authenticate,
  requireOwner,
  (req, res) => {
    req.document.status = "pending_approval";

    res.json({
      message: "Document submitted for approval"
    });
  }
);

app.post(
  "/documents/:id/decision",
  authenticate,
  requireRole("approver"),
  (req, res) => {
    const document = documents.get(req.params.id);

    if (!document) {
      return res.status(404).json({
        error: "Document not found"
      });
    }

    if (document.status !== "pending_approval") {
      return res.status(409).json({
        error: "Document is not awaiting approval"
      });
    }

    const { decision } = req.body;

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({
        error: "Decision must be approved or rejected"
      });
    }

    document.status = decision;
    document.reviewedBy = req.user.sub;
    document.reviewedAt = new Date().toISOString();

    res.json({
      message: `Document ${decision}`,
      status: document.status
    });
  }
);

app.get(
  "/documents/:id",
  authenticate,
  requireOwner,
  (req, res) => {
    res.json(req.document);
  }
);

app.post("/demo/promote/:userId", (req, res) => {
  const user = users.find(item => item.id === req.params.userId);

  if (!user) {
    return res.status(404).json({
      error: "User not found"
    });
  }

  user.role = "approver";

  res.json({
    message: "Demo user promoted",
    role: user.role
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Document Approval API running");
});
