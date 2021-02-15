import { ServerSetup } from "./ServerSetup";
import { Request, Response } from "express";
import ioclient from "socket.io-client";

export class Server extends ServerSetup {

    twitterAPISocket: ioclient.Socket;
    avAPISocket: ioclient.Socket;

    public constructor(
        port:string='3000', hostname:string='127.0.0.1', tweetAPIServer:string='http://127.0.0.1:3010/', avAPIServer:string='http://127.0.0.1:3100/'
    ) {
        super(port,hostname);
        this.getRequests();
        this.twittwerAPI();
        this.alphaVantageAPI();      
        this.twitterAPISocket = ioclient.io(tweetAPIServer);
        this.avAPISocket = ioclient.io(avAPIServer);
    }


    private getRequests():void {
        this.app.get('/', (req:Request,res:Response) => res.status(200).render('index'));
    }


    private getQuery(params:any):string {

        let queryString = '';
        for (let key of Object.keys(params)) {
            queryString += `${key}=${params[key].toUpperCase()}&`;
        }
        queryString = '?' + queryString.slice(0, -1);
        
        return queryString;
    }


    private twittwerAPI():void {
        
        var tweetStreamState = false;

        this.app.post('/TweetStream/Rules', (req:Request, res:Response):void => {
            
            if (tweetStreamState) {
                res.status(404).send();
                return;
            };

            this.twitterAPISocket.connect();

            console.info('\nTwitter Socket Connected');
            console.warn('Requesting Rules Update:\n');

            this.twitterAPISocket.once('disconnect',() => console.info('Twitter Socket Disconnected\n'));
            this.twitterAPISocket.once('rulePayload', (data:object) => {
                console.log(data);
                console.warn('\nRules Request Complete');
            });
            this.twitterAPISocket.emit('requestType', { 'request':'tweetStreamRules', 'body':req.body });
            
            res.status(200).send();
        });
        
        this.app.post('/TweetStream/Open', (req:Request,res:Response):void => {
            
            if (tweetStreamState) {
                res.status(404).send();
                return;
            }

            this.twitterAPISocket.connect();
 
            console.info('\nTwitter Socket Connected');
            console.warn('Opening Tweet Stream:\n');
        
            this.twitterAPISocket.once('disconnect',() => console.info('Twitter Socket Disconnected\n'));
            this.twitterAPISocket.once('apiError', (error:object) => {
                console.warn('Closing Tweet Stream (Error)');
                this.twitterAPISocket.off('Tweet');
                tweetStreamState = false;
                if (res.headersSent == false) res.status(500).json({ 'Err':error });
                console.error(error);
            });
          
            this.twitterAPISocket.on('Tweet', (data:any) => {

                x++;
                console.log(x, data['data']['text']);
                console.log('\n<--------------------------------------------->\n');

                if (req.body['numberOfTweets'].length && x >= parseInt(req.body['numberOfTweets'])) {
                    console.warn('Closing Tweet Stream (Set Tweet Number Reached)');
                    this.twitterAPISocket.emit('closeTweetStream');
                    this.twitterAPISocket.off('Tweet');
                    tweetStreamState = false;
                }
            });
            let x: number = 0;

            this.twitterAPISocket.emit('requestType', { 'request':'tweetStream' });
            tweetStreamState = true; 
            if (res.headersSent == false) res.status(200).send();
        });

        this.app.post('/TweetStream/Close', (req:Request,res:Response):void => {
            
            if (!tweetStreamState) {
                res.status(404).send();
                return;
            };
            
            console.warn('Closing Tweet Stream (User Requested)');
            this.twitterAPISocket.emit('closeTweetStream');
            this.twitterAPISocket.off('Tweet');
            tweetStreamState = false;
            res.status(200).send();
        });
    }


    private alphaVantageAPI():void {
        
        this.app.post('/CompOverview', (req:Request,res:Response):void => {

            this.avAPISocket.connect();

            console.info('\nAV API Socket Connected');
            console.warn('Requesting Company Overview:\n');
            
            this.avAPISocket.once('disconnect', () => console.info('AV API Socket Disconnected\n'));
            this.avAPISocket.once('overviewPayload', (data:object) => {
                console.log(data);
                console.warn('\nOverview Request Complete');
            });
            this.avAPISocket.emit('requestType', { 'request':'compOverview','query':this.getQuery(req.body) });

            res.status(200).send();
        });
    }
}