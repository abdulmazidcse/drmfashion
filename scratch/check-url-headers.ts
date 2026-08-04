async function main() {
  const url = "http://localhost:9000/fashion-store-bucket/fashion-1784543230073-591885608.mp4";
  console.log(`Fetching headers for: ${url}`);
  
  try {
    const res = await fetch(url, { method: "HEAD" });
    console.log("Response headers:");
    res.headers.forEach((value, key) => {
      console.log(`- ${key}: ${value}`);
    });
  } catch (error: any) {
    console.error("Error fetching headers:", error.message || error);
  }
}

main();
