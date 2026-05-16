import { coreIdentity } from './coreIdentity';
import { projectMohamed } from './projectMohamed';
import { googleIo2026 } from './googleIo2026';
import { aiHistory } from './aiHistory';
import { aiFuture } from './aiFuture';
import { truthProtocol } from './truthProtocol';
import { resonanceTech } from './resonanceTech';
import { vibeCoding } from './vibeCoding';

export function getRelevantKnowledge(message: string): string {
    const context: string[] = [];
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('who are you') || lowerMessage.includes('من أنت') || lowerMessage.includes('what are you') || lowerMessage.includes('tell me about yourself')) {
        context.push(coreIdentity);
        context.push(projectMohamed);
    }
    if (lowerMessage.includes('who made you') || lowerMessage.includes('من صنعك') || lowerMessage.includes('who built you') || lowerMessage.includes('mohamed osama')) {
        context.push(projectMohamed);
    }
    if (lowerMessage.includes('google i/o') || lowerMessage.includes('countdown') || lowerMessage.includes('2026')) {
        context.push(googleIo2026);
    }
    if (lowerMessage.includes('history of ai') || lowerMessage.includes('turing') || lowerMessage.includes('turing test') || lowerMessage.includes('ai history')) {
        context.push(aiHistory);
    }
    if (lowerMessage.includes('future of ai') || lowerMessage.includes('replace humans') || lowerMessage.includes('dangerous') || lowerMessage.includes('ai future')) {
        context.push(aiFuture);
    }
    if (lowerMessage.includes('how does it work') || lowerMessage.includes('particles') || lowerMessage.includes('technical') || lowerMessage.includes('technology') || lowerMessage.includes('three.js') || lowerMessage.includes('webgl') || lowerMessage.includes('neural') || lowerMessage.includes('كيف يعمل') || lowerMessage.includes('تقني')) {
        context.push(resonanceTech);
    }
    if (lowerMessage.includes('vibe coding') || lowerMessage.includes('how was it built') || lowerMessage.includes('development') || lowerMessage.includes('how did you build') || lowerMessage.includes('كيف بنيت') || lowerMessage.includes('البرمجة')) {
        context.push(vibeCoding);
    }
    
    // Always include a baseline identity & truth protocol
    if (context.length === 0) {
        context.push(coreIdentity);
    }
    context.push(truthProtocol);

    return "=== KNOWLEDGE CONTEXT ===\\n" + context.join('\\n') + "\\n=== END CONTEXT ===\\nUse the above context to answer the user's message appropriately.";
}
