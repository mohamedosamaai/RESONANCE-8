const instantGreetings: Record<string, string[]> = {
    'hi': ["Welcome to RESONANCE. I'm ready.", "Hello. How can I illuminate your path?", "Greetings. I am online and listening.", "Hello. Systems are synchronized."],
    'hello': ["Welcome to RESONANCE. I'm ready.", "Hello. How can I illuminate your path?", "Greetings. I am online and listening.", "Hello. Systems are synchronized."],
    'hey': ["Welcome to RESONANCE. I'm ready.", "Hello. How can I illuminate your path?", "Greetings. I am online and listening.", "Hello. Systems are synchronized."],
    'هاي': ["أهلاً بك في تجربة الرنين. أنا جاهز.", "مرحباً. الأنظمة متزامنة وأنا أستمع إليك.", "أهلاً. كيف يمكنني إضاءة مسارك اليوم؟"],
    'مرحبا': ["أهلاً بك في تجربة الرنين. أنا جاهز.", "مرحباً. الأنظمة متزامنة وأنا أستمع إليك.", "أهلاً. كيف يمكنني إضاءة مسارك اليوم؟"],
    'أهلا': ["أهلاً بك في تجربة الرنين. أنا جاهز.", "مرحباً. الأنظمة متزامنة وأنا أستمع إليك.", "أهلاً. كيف يمكنني إضاءة مسارك اليوم؟"],
};

export function getGreeting(message: string): string | null {
    const cleanMsg = message.toLowerCase().trim().replace(/[.,!?؟]/g, '');
    if (instantGreetings[cleanMsg]) {
        const options = instantGreetings[cleanMsg];
        return options[Math.floor(Math.random() * options.length)];
    }
    return null;
}
