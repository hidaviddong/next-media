// Mock third-party API service
export interface MovieApiResponse {
  success: boolean;
  data?: {
    title: string;
    year: string;
    director: string;
    rating: number;
    poster?: string;
  };
  error?: string;
}

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock API call to third-party service
export async function fetchMovieInfo(
  name: string,
  year?: string
): Promise<MovieApiResponse> {
  // Simulate network delay
  await delay(Math.random() * 2000 + 1000); // 1-3 seconds

  // Simulate different scenarios
  const random = Math.random();

  if (random < 0.7) {
    // 70% success rate
    return {
      success: true,
      data: {
        title: name,
        year: year || "Unknown",
        director: "Mock Director",
        rating: Math.floor(Math.random() * 5) + 1,
        poster: `https://via.placeholder.com/300x450/666/fff?text=${encodeURIComponent(
          name
        )}`,
      },
    };
  } else if (random < 0.85) {
    // 15% rate limit error
    return {
      success: false,
      error: "Rate limit exceeded. Please try again later.",
    };
  } else {
    // 15% not found error
    return {
      success: false,
      error: "Movie not found in database.",
    };
  }
}

// Batch process movies
export async function processMoviesBatch(
  movies: Array<{ name: string; year?: string }>
) {
  const results = [];

  for (const movie of movies) {
    try {
      const result = await fetchMovieInfo(movie.name, movie.year);
      results.push({
        movie,
        result,
      });
    } catch (error) {
      results.push({
        movie,
        result: {
          success: false,
          error: "Network error occurred",
        },
      });
    }
  }

  return results;
}
