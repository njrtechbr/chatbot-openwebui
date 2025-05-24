"use client";

import { useState, useRef, FormEvent, useEffect } from "react";
import styles from "./page.module.css";

type Message = {
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read";
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      sender: "user",
      text: input,
      timestamp: getCurrentTime(),
      status: "sent"
    };

    setMessages((msgs) => [...msgs, userMessage]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: input,
          conversationId: conversationId 
        }),
      });
      const data = await res.json();
      
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      // Atualiza o status da mensagem do usuário para "read"
      setMessages((msgs) => 
        msgs.map((msg, idx) => 
          idx === msgs.length - 1 ? { ...msg, status: "read" } : msg
        )
      );

      // Adiciona a resposta do bot
      setMessages((msgs) => [
        ...msgs,
        { 
          sender: "bot",
          text: data.response || data.error || "Erro ao responder.",
          timestamp: getCurrentTime()
        },
      ]);
    } catch {
      setMessages((msgs) => [
        ...msgs,
        { 
          sender: "bot",
          text: "Erro ao conectar com a IA.",
          timestamp: getCurrentTime()
        },
      ]);
    }
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerAvatar}>
          <svg viewBox="0 0 32 32" width="24" height="24" fill="white">
            <path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2zm0 4a4.5 4.5 0 1 1-4.5 4.5A4.5 4.5 0 0 1 16 6zm8 17.5a11.5 11.5 0 0 1-16 0v-.6c0-2.7 5.3-4.2 8-4.2s8 1.5 8 4.2z"/>
          </svg>
        </div>
        <div className={styles.headerInfo}>
          <span className={styles.headerTitle}>Assistente Virtual</span>
          <span className={styles.headerStatus}>
            {loading ? 'digitando...' : 'online'}
          </span>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.chatContainer}>
          <div className={styles.messagesContainer}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.messageWrapper} ${
                  msg.sender === "user" ? styles.user : styles.bot
                }`}
              >
                <div className={styles.message}>
                  {msg.text}
                  <span className={styles.messageTime}>
                    {msg.timestamp}
                    {msg.sender === "user" && (
                      <span className={styles.messageStatus}>
                        {msg.status === "read" ? (
                          <svg viewBox="0 0 16 11" width="16" height="11" fill="#53bdeb">
                            <path d="m15.01 3.316-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                          </svg>
                        ) : msg.status === "delivered" ? (
                          <svg viewBox="0 0 16 15" width="16" height="15" fill="#8696a0">
                            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 16 15" width="16" height="15" fill="#8696a0">
                            <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                          </svg>
                        )}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className={`${styles.messageWrapper} ${styles.bot}`}>
                <div className={styles.message}>
                  <span className={styles.typing}>digitando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.inputContainer}>
            <form onSubmit={sendMessage} className={styles.inputForm}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustTextareaHeight();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e);
                  }
                }}
                placeholder="Digite uma mensagem"
                className={styles.input}
                disabled={loading}
                rows={1}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className={styles.sendButton}
                title="Enviar"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" className={styles.sendIcon}>
                  <path fill="currentColor" d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/>
                </svg>
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
