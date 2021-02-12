import { ServerSetup } from "./ServerSetup";
import { Request, Response } from "express";
import ioclient from "socket.io-client";

export class Server extends ServerSetup {

    tweetStreamState: boolean;
    tweetsSocket: ioclient.Socket;
    avAPISocket: ioclient.Socket;

    public constructor(port:string='3000', hostname:string='127.0.0.1') {
        super(port,hostname);
        this.tweetStreamState = false;
        this.tweetsSocket = ioclient.io('http://127.0.0.1:3010/');
        this.avAPISocket = ioclient.io('http://127.0.0.1:3100/');
        this.tweetStream();
        this.alphaVantageAPI();
        this.getRequests();
    }


    private getRequests():void {
        this.app.get('/', (req:Request,res:Response) => res.status(200).render('index'));
    }


    private tweetStream():void {
        
        this.app.post('/TweetStream', (req:Request,res:Response):void => {
            
            if (this.tweetStreamState) {
                res.status(404).send();
                return;
            }

            this.tweetsSocket.connect();

            this.tweetsSocket.once('connect', () => {
                
                console.info('\nTwitter Socket Connected');
                console.warn('Opening Tweet Stream:\n');
                this.tweetStreamState = true;
            
                this.tweetsSocket.once('disconnect',() => console.info('Twitter Socket Disconnected\n'));

                this.tweetsSocket.once('apiError', (error:object) => {
                    console.warn('Closing Tweet Stream (Error)');
                    this.tweetsSocket.off('Tweet');
                    this.tweetStreamState = false;
                    res.status(500).json({'Err':error});
                    console.error(error);
                });

                let x: number = 0;             
                this.tweetsSocket.on('Tweet', (data:any):void => {
                    
                    console.log(data['data']['text']);
                    console.log('\n<--------------------------------------------->\n');
                    x++;

                    if (req.body['numberOfTweets'].length && x >= parseInt(req.body['numberOfTweets'])) {
                        console.warn('Closing Tweet Stream (Set Tweet Number Reached)');
                        this.tweetsSocket.emit('closeTweetStream');
                        this.tweetsSocket.off('Tweet');
                        this.tweetStreamState = false;
                    }
                });
            });
            if (res.headersSent == false) res.status(200).send();
        });

        this.app.post('/CloseTweetStream', (req:Request,res:Response):void => {
            
            if (!this.tweetStreamState) {
                res.status(404).send();
                return;
            };
            
            console.warn('Closing Tweet Stream (User Requested)');
            this.tweetsSocket.emit('closeTweetStream');
            this.tweetsSocket.off('Tweet');
            this.tweetStreamState = false;
            res.status(200).send();
        });
    }


    private alphaVantageAPI():void {
        
        this.app.post('/CompOverview', (req:Request,res:Response):void => {

            this.avAPISocket.connect();
            
            this.avAPISocket.once('connect', () => {
                
                console.info('\nAV API Socket Connected');
                console.warn('Requesting Overview Data:\n');

                this.avAPISocket.emit('params', req.body);
                this.avAPISocket.once('disconnect', () => console.info('AV API Socket Disconnected\n'));
                this.avAPISocket.once('CompanyData', (data:object) => {
                    console.log(data);
                    console.warn('\nOverview Request Complete');
                });
                
                res.status(200).send();
            });
        });
    }
}