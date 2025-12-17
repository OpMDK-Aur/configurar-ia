import { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { useConversation } from '../hooks/useConversation';
import FeedbackModal from './FeedbackModal';
import { actions } from 'astro:actions';
import type { AirtableRecord } from '../types/airtable';
import type { FormularioConfiguracion } from '../types';

export default function Chat({ clienteId }: { clienteId: string }) {
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [previousMessage, setPreviousMessage] = useState<Message | null>(null);
  const [assistantName, setAssistantName] = useState<string>('');
  const [isAssistantConfigured, setIsAssistantConfigured] = useState<boolean | null>(null);
  const openFeedbackModal = (message: Message, previousMessage: Message) => {
    setSelectedMessage(message);
    setPreviousMessage(previousMessage);
    setIsFeedbackModalOpen(true);
  }
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // useConversation solo con clienteId
  const { messages, setMessages, conversationId, isLoading, setIsLoading, handleNewChat,createNewConversation } = useConversation(clienteId);

  useEffect(() => {
    const fetchAssistantName = async () => {
      try {
        const { data } = await actions.obtenerDatosConfiguracion();
        if (data?.success && data.data) {
          const airtableRecord = data.data as AirtableRecord;
          const fields = airtableRecord.fields as FormularioConfiguracion;
          if (fields.NombreAsistente) {
            setAssistantName(fields.NombreAsistente);
          }
        }
      } catch (error) {
        // console.error('Error fetching assistant name:', error);
      }
    };

    fetchAssistantName();
  }, []);

  useEffect(() => {
    const validateAssistant = async () => {
      try {
        const response = await fetch('/api/validate-config');
        const data = await response.json();
        
        if (data.success) {
          setIsAssistantConfigured(data.isConfigured);
          if (!data.isConfigured) {
            // console.warn('Assistant no configurado:', data.message);
          }
        }
      } catch (error) {
        // console.error('Error validando assistant:', error);
        setIsAssistantConfigured(false);
      }
    };

    validateAssistant();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !conversationId) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    handleNewChat(userMessage);
  };  

  if (isAssistantConfigured === false) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            ⚠️ Asistente no configurado correctamente
          </h3>
          <p className="text-red-700 mb-4">
            El asistente no tiene un ID válido de OpenAI. Esto puede suceder si:
          </p>
          <ul className="text-sm text-red-600 mb-4 text-left space-y-1">
            <li>• No se completó el proceso de creación del agente</li>
            <li>• Hubo un error durante la configuración</li>
            <li>• El campo openAiAssistantId está vacío en Airtable</li>
          </ul>
          <div className="space-y-2">
            <a 
              href="/" 
              className="block bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Ir a configuración
            </a>
            <button 
              onClick={() => window.location.reload()} 
              className="block w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col w-full h-full">
        {/* Header with clear conversation button */}
        <div className="flex justify-between items-center px-5 py-2 bg-white rounded-t-lg border border-[#ddd]">
          <div className='flex items-center gap-2'>
            <span className="text-sm font-medium">Asistente: {assistantName}</span>
          </div>
          <button 
            className='bg-[#ffffff00] text-[#7806F1] p-2 rounded-md hover:bg-[#7806F1]/10 transition-all duration-150 active:scale-95 flex items-center gap-2' 
            onClick={() => createNewConversation()}
            title="Limpia la conversación"
          >
            <img src="/wipe-clean.svg" alt="Reiniciar conversación" className="w-6 h-6" />
            <span className="text-sm font-medium">Limpiar conversación</span>
          </button>
        </div>
        
        <div className="relative min-h-[500px] flex-1 px-5 pt-5 pb-5 flex flex-col justify-between gap-5 bg-white border-x border-b border-[#ddd] rounded-b-lg">
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`relative text-md mb-3 p-1 rounded-t-lg ${message.role === 'user'
                  ? 'bg-[#7806F1] text-white ml-auto rounded-bl-lg'
                  : 'bg-gray-100 text-gray-800 rounded-br-lg'
                  } max-w-[60%] min-h-10`}
              >
                <div className='flex align-center gap-3'>
                  <p className='flex-1'>{message.content}</p>
                  {message.role === 'assistant' && (
                    <div className='flex gap-5 align-center'>
                      <button className='hover:cursor-pointer transition-all duration-150 active:scale-95'>
                        <img src='/thumb-up-svgrepo-com.svg' height={19} width={19} />
                      </button>
                      <button onClick={() => openFeedbackModal(message, messages[index-1] )} className='hover:cursor-pointer transition-all duration-150 active:scale-95'>
                        <img src='/thumb-down-svgrepo-com.svg' height={19} width={19} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end pt-5">
                  <span className={`text-sm ${message.role === 'user' ? 'text-white' : 'text-gray-500'}`}>
                    {new Date(message.hora || Date.now()).toLocaleTimeString([], {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <span
                  className={`
                  absolute
                  bottom-0
                  ${message.role === 'user'
                      ? 'right-[-10px] border-l-[10px] border-l-[#7806F1] border-t-[10px] border-t-transparent'
                      : 'left-[-10px] border-r-[10px] border-r-gray-100 border-t-[10px] border-t-transparent'
                    }
                  w-0 h-0
                  `}
                  style={{
                    borderBottom: 'none',
                    borderTopStyle: 'solid',
                    borderLeftStyle: message.role === 'user' ? 'solid' : 'none',
                    borderRightStyle: message.role !== 'user' ? 'solid' : 'none',
                  }}
                />
              </div>
            ))}
            {isLoading && (
              <div className="mb-4 p-3 rounded-lg bg-gray-100 text-gray-800 max-w-[80%]">
                Escribiendo...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex justify-between gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              className="flex-1 p-2 border border-[#ddd] rounded-lg focus:outline-1 outline-[#7806F1]"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="hover:cursor-pointer transition-all duration-150 active:scale-95 disabled:opacity-50"
            >
              <img
                src="/send-icon.svg"
                alt="Icono de enviar"
                className="w-10 h-10"
              />
            </button>
          </form>
        </div>
      </div>
      {isFeedbackModalOpen && selectedMessage && previousMessage && (
        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          isPositive={false}
          message={selectedMessage}
          previousMessage={previousMessage}
          onClose={() => setIsFeedbackModalOpen(false)}
        />
      )}
    </>
  );
} 