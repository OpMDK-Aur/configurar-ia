import { useState, useEffect } from "react";
import { Message, MessageFromAirtable } from "../types";

export function useConversation(clienteId: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [threadId, setThreadId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Load existing conversation on component mount
    useEffect(() => {
        const loadConversation = async () => {
            try {
                const response = await fetch('/api/conversations');
                const data = await response.json();
                // Eliminadas llamadas a console.log y console.error para producción

                if (data.success) {
                    if (data.conversation) {
                        setConversationId(data.conversation.id);
                        setThreadId(data.conversation.ThreadId);
                        setMessages(data.messages.map((msg: MessageFromAirtable) => ({
                            id: msg.id,
                            role: msg.RoleOpenAI,
                            content: msg.Contenido,
                            hora: msg.FechaHora
                        })));
                    } else {
                        // console.log('25: No existing conversation found, creating a new one in useConversation');
                        createNewConversation();
                    }
                }
            } catch (error) {
                // console.error('29: Error loading conversation:', error);
            }
        };

        loadConversation();
    }, []);

    const createNewConversation = async () => {
        try {
            // Create new conversation if none exists
            const createResponse = await fetch('/api/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clienteId: clienteId,
                })
            });
            const createData = await createResponse.json();

            if (createData.success) {
                setConversationId(createData.conversationId);
                setThreadId(createData.threadId);
                setMessages([]);
            }
        } catch (error) {
            // console.error('48: Error creating new conversation in useConversation:', error);
        }
    };

    const handleNewChat = async (userMessage: Message) => {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage.content,
                    conversationId,
                    threadId
                }),
            });

            const data = await response.json();

            if (data.success) {
                setMessages(prev => [...prev, {
                    id: data.MsgId,
                    role: 'assistant',
                    content: data.response
                }]);
            } else {
                throw new Error(data.error || 'Error al procesar el mensaje en handleNewChat in useConversation');
            }
        } catch (error) {
            // console.error('Error catch handleNewChat:', error);
            setMessages(prev => [...prev, {
                id: 'error',
                role: 'assistant',
                content: 'Lo siento, hubo un error al procesar tu mensaje.'
            }]);
        } finally {
            setIsLoading(false);
        }
    }

    return { messages, conversationId, threadId, isLoading, setIsLoading, setMessages, setConversationId, createNewConversation, handleNewChat };
}