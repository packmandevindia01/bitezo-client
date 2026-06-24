const axios = require("axios");

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6IkFkbWluIiwiVG9rZW5UeXBlIjoiYXV0aCIsInRlbmFudElkIjoiYXBwX2RiIiwiYnJhbmNoSWQiOiIwIiwiY291bnRlcklkIjoiMCIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFkbWluIiwiY2xpZW50X3R5cGUiOiJiYWNrb2ZmaWNlLWFwcCIsImV4cCI6MTc4MjI4NDY2MSwiaXNzIjoiTXlBcHAiLCJhdWQiOiJiYWNrb2ZmaWNlLWFwcCJ9.LBZkDn4qpCHwo6RNyDmyFMPFM0JFB70BFb5zbKmyDOY";

async function test() {
  try {
    const res = await axios.post("http://84.255.173.131:8068/api/receipt", {}, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    console.log(res.data);
  } catch (err) {
    if (err.response) {
      console.log(JSON.stringify(err.response.data, null, 2));
    }
  }
}

test();
