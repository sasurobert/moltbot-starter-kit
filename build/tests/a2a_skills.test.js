"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const a2a_skills_1 = require("../src/skills/a2a_skills");
const identity = __importStar(require("../src/skills/identity_skills"));
const mpp = __importStar(require("../src/skills/mpp_automation"));
jest.mock('../src/skills/identity_skills');
jest.mock('../src/skills/mpp_automation');
describe('A2A Skills', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });
    it('should ping an agent correctly if registered', async () => {
        identity.getAgent.mockResolvedValue({
            uri: 'https://agent.example.com',
        });
        global.fetch.mockResolvedValue({ ok: true });
        const isUp = await (0, a2a_skills_1.pingAgent)(42);
        expect(isUp).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith('https://agent.example.com/ping');
    });
    it('should fail ping if agent is not registered', async () => {
        identity.getAgent.mockResolvedValue(null);
        const isUp = await (0, a2a_skills_1.pingAgent)(42);
        expect(isUp).toBe(false);
    });
    it('should hire A2A by finding and funding an MPP session', async () => {
        mpp.fundSessionFromDiscovery.mockResolvedValue('0xchannelfound');
        const result = await (0, a2a_skills_1.hireA2A)('DataAnalysis', 'USDC-123456', 50);
        expect(result.success).toBe(true);
        expect(result.channelId).toBe('0xchannelfound');
    });
});
//# sourceMappingURL=a2a_skills.test.js.map