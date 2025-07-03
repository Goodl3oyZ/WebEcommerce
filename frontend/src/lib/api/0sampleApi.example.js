import axios from "axios";

// Sample API GET request
export const fetchSampleData = async () => {
  try {
    const response = await axios.get(
      "https://jsonplaceholder.typicode.com/posts"
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching sample data:", error);
    throw error;
  }
};
