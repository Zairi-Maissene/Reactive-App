export class RiskManagementService {
    async processRisk(file) {
        // Simulate processing image
        await new Promise(resolve => setTimeout(resolve, 1000));
        return Math.random() * 100;
    }
}
