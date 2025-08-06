class ModerbotClient {
    websocket = null;

    constructor() {
        this.socket = new WebSocket("ws://localhost:8080");

        this.socket.addEventListener("open", (event) => {
            this.socket.send("Hello Server!");
        });

        this.socket.addEventListener("message", (event) => {
            console.log("Message from server ", event.data);
            this.addNotification(event.data);
        });
    }

    sendCommand(command) {
        this.socket.send(command);
    }

    addNotification(message) {
        document.append('<div class="moderbot-notification">' + message + '</div>');
    }
}