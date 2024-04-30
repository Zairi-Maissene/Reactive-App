export class CommercialService {
    async processFile(file) {
        // Simulate processing file
        await new Promise(resolve => setTimeout(resolve, 1000));
        return file;
    }
    async getScore(file) {
        // Simulate processing image
        await new Promise(resolve => setTimeout(resolve, 1000));
        return Math.random() * 100;
    }
}

