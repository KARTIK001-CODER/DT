const express = require("express");

const movieRoutes = require("./routes/movieRoutes");
const logger = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(express.json());

// Custom middleware
app.use(logger);

// Movie routes
app.use("/movies", movieRoutes);

// Centralized error handler
app.use(errorHandler);

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});