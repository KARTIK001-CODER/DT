const express = require("express");
const router = express.Router();

const movies = require("../data/movies");

router.get("/", (req, res, next) => {
  try {
    const { genre, rating } = req.query;

    // Input validation
    if (
      rating !== undefined &&
      (rating.trim() === "" ||
        !Number.isFinite(Number(rating)) ||
        Number(rating) < 0 ||
        Number(rating) > 10)
    ) {
      const error = new Error(
        "Rating must be a number between 0 and 10"
      );

      error.status = 400;
      throw error;
    }

    // Movie filtering
    const filteredMovies = movies.filter(movie => {
      const genreMatch =
        !genre ||
        movie.genre.toLowerCase() === genre.toLowerCase();

      const ratingMatch =
        rating === undefined ||
        movie.rating >= Number(rating);

      return genreMatch && ratingMatch;
    });

    res.status(200).json({
      success: true,
      count: filteredMovies.length,
      movies: filteredMovies
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;