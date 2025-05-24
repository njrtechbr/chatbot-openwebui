-- Table to map WhatsApp sender numbers to conversation IDs
CREATE TABLE IF NOT EXISTS whatsapp_conversations_map (
  sender_number TEXT PRIMARY KEY, -- Normalized sender phone number
  conversation_id UUID NOT NULL UNIQUE, -- Foreign key to conversations.id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- Optional: for tracking updates
);

-- It's good practice to also ensure the conversation_id refers to a valid conversation.
-- If the conversations table is consistently maintained, an explicit foreign key can be added.
-- For now, the application logic in conversation-manager.ts ensures conversation entry.
-- ALTER TABLE whatsapp_conversations_map
-- ADD CONSTRAINT fk_conversation_id
-- FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- Index for faster lookups on conversation_id if needed (e.g., if you often search by conversation_id)
-- CREATE INDEX IF NOT EXISTS idx_whatsapp_map_conversation_id ON whatsapp_conversations_map(conversation_id);

COMMENT ON TABLE whatsapp_conversations_map IS 'Maps WhatsApp sender phone numbers to internal conversation IDs.';
COMMENT ON COLUMN whatsapp_conversations_map.sender_number IS 'Normalized WhatsApp sender phone number (e.g., international format without symbols).';
COMMENT ON COLUMN whatsapp_conversations_map.conversation_id IS 'The UUID of the conversation in the conversations table.';
