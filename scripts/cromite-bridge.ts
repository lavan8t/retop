import net from "net";

const TCP_PORT = 9222;
const ABSTRACT_SOCKET = "\0chrome_devtools_remote";

const server = net.createServer((clientSocket) => {
  const remoteSocket = net.connect({ path: ABSTRACT_SOCKET }, () => {
    clientSocket.pipe(remoteSocket);
    remoteSocket.pipe(clientSocket);
  });

  remoteSocket.on("error", (err) => {
    clientSocket.destroy(err);
  });

  clientSocket.on("error", () => {
    remoteSocket.destroy();
  });
});

server.listen(TCP_PORT, "127.0.0.1", () => {
  console.log(`[Cromite Bridge] Forwarding tcp://127.0.0.1:${TCP_PORT} -> ${ABSTRACT_SOCKET}`);
});
