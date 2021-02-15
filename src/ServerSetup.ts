import express, { Express } from "express";
import bodyParser from "body-parser";
import http from "http";

export class ServerSetup {

    private port: string;
    private hostname: string;
    protected server: http.Server;
    protected app: Express;
    
    protected constructor(port:string, hostname:string) {
        this.port = process.env.PORT || port;
        this.hostname = hostname
        this.app = express();
        this.server = new http.Server(this.app);
        this.otherServerSetup();
        this.startServer();
    }

    private otherServerSetup():void {
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(bodyParser.json());
        this.app.use(express.static('public'));
        this.app.set('view engine', 'ejs');
    }

    private startServer():void {
        this.server.listen(parseInt(this.port), this.hostname, ():void =>
            console.log(`\nClient API - HTTP Server started on http://${this.hostname}:${this.port}\n`));
    }

    private serverClose():void {
        this.server.close((e?:Error) => (e) ? console.error('ER0', e) : console.log('\nTwitterAPI - Server Shutdown Successfully\n'));
    }
}