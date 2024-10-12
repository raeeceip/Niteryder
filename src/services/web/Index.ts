// make this a web page with a button that turns on the nightryder service, and a box that streams its logoutput

import { Service } from '../Service';

export class Index extends Service {
    constructor() {
        super();
    }

    public async start() {
        const button = document.createElement('button');
        button.innerText = 'Start NightRyder';
        button.onclick = async () => {
            await this.startService('nightryder');
        };
        document.body.appendChild(button);

        const logOutput = document.createElement('div');
        logOutput.style.width = '100%';
        logOutput.style.height = '200px';
        logOutput.style.overflow = 'auto';
        logOutput.style.border = '1px solid black';
        document.body.appendChild(logOutput);

        this.services.nightryder.on('log', (log: string) => {
            logOutput.innerText += log + '\n';
            logOutput.scrollTop = logOutput.scrollHeight;
        });
    }
}


