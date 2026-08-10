require("dotenv").config();

const http = require("http");
const approveStep = require("./approve-step");

const server = http.createServer(async (req, res) => {
  let body = "";

  req.on("data", chunk => {
    body += chunk;
  });

  req.on("end", async () => {
    try {
      req.body = body ? JSON.parse(body) : {};

      res.status = (code) => {
        res.statusCode = code;
        return res;
      };

      res.json = (data) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(data));
      };

      await approveStep(req, res);
    } catch (error) {
      console.error(error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error.message }));
    }
  });
});

server.listen(3000, () => {
  console.log("Test server running on http://localhost:3000");
});
