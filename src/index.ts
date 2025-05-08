import { ArgXClient } from "./ArgXClient";


const createTransportClient = (baseAddress: string, tokenSelector: () => string) => {
    const client =  new ArgXClient(baseAddress, tokenSelector);
    

    return {
        scope: <T>(name: string) => { 
            return client.create<T>(name)
        }
    }
}


export {
    createTransportClient
}