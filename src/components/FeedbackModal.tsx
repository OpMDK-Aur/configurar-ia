import { useState } from "react";
import { Message } from "../types";

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: Message;
    isPositive: boolean;
    previousMessage: Message;
    }

export default function FeedbackModal({ isOpen, onClose, message, isPositive, previousMessage }: FeedbackModalProps) {
    const [feedback, setFeedback] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!feedback.trim()) return;

        setSending(true);
        setError(null);
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: message.id, content: feedback, isPositive, previousMessage: previousMessage.content }),
            });

            if (!res.ok) throw new Error("Error al enviar feedback");
            setSent(true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Error desconocido";
            setError(msg);
        } finally {
            setSending(false);
        }
    }
   

    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {sent ? (
                    <div className="flex flex-col items-center gap-4">
                        <h2 className="text-center text-xl font-semibold">
                            ¡Gracias por tu feedback! 🎉
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                            autoFocus
                        >
                            Cerrar
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Tu feedback</h2>
                            <img src='/thumb-down-svgrepo-com.svg' height={19} width={19} />
                        </div>

                        {/* User Message */}
                        <div className="bg-[#7806F1] text-white p-4 rounded-lg">
                            <p className="text-sm mb-2">Tu mensaje:</p>
                            <p>{previousMessage.content}</p>
                            <div className="text-right mt-2 text-sm text-white/80">
                                {new Date(message.hora || Date.now()).toLocaleTimeString([], {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                        </div>
                        
                        {/* Assistant Message */}
                        <div className="bg-gray-100 p-4 rounded-lg">
                            <p className="text-sm mb-2 text-gray-600">Respuesta del asistente:</p>
                            <p>{message.role === 'assistant' ? message.content : ''}</p>
                            <div className="text-right mt-2 text-sm text-gray-500">
                                {new Date(message.hora || Date.now()).toLocaleTimeString([], {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                        </div>

                        {/* Correction Textarea */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                ¿Qué mejorarías en la respuesta?
                            </label>
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                rows={4}
                                required
                                className="w-full resize-none rounded-xl border p-3 focus:border-indigo-500 focus:outline-none"
                                placeholder="Escribe aquí tu sugerencia de mejora..."
                            ></textarea>
                        </div>

                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border px-4 py-2 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={sending}
                                className="rounded-xl bg-[#7806F1] px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {sending ? "Enviando…" : "Enviar"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
