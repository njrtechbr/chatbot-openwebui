import { supabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';

/**
 * Ensures a conversation entry exists in the 'conversations' table.
 * If a similar function exists elsewhere (e.g., in memory.ts), consider refactoring.
 * @param conversationId The ID of the conversation to ensure.
 */
async function ensureConversation(conversationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('conversations')
      .insert({ id: conversationId })
      .select('id')
      .single(); // Use single to potentially get the inserted row or null

    // .onConflict('id').ignore() is preferred if your Supabase version supports it well.
    // However, a more explicit check can be done if 'upsert' with 'ignoreDuplicates: true' isn't behaving as expected
    // or if you need to confirm the existence without causing an error that stops execution.

    if (error) {
      // Check if the error is because the conversation already exists (PK violation)
      // Supabase error codes for unique violations might vary based on underlying PostgreSQL settings.
      // Common code is '23505' for unique_violation.
      if (error.code === '23505') {
        // Conversation already exists, which is fine.
        console.log(`Conversation ${conversationId} already exists.`);
      } else {
        // Another error occurred
        console.error('Error ensuring conversation in Supabase:', error);
        throw error; // Re-throw for higher-level handling if necessary
      }
    }
  } catch (err) {
    // Catch any other errors, including network issues or if Supabase client itself throws.
    console.error('Exception in ensureConversation:', err);
    // Decide if this should throw or be handled more gracefully depending on application needs.
    // For now, we log and it might implicitly throw if 'error' above was re-thrown.
  }
}


/**
 * Retrieves or creates a conversation ID for a given WhatsApp sender number.
 * @param senderNumber The phone number of the WhatsApp sender.
 * @returns A promise that resolves to the conversation ID.
 */
export async function getConversationIdForWhatsapp(senderNumber: string): Promise<string> {
  const normalizedSenderNumber = senderNumber.replace(/\D/g, '');

  try {
    // 1. Check for existing mapping
    let { data: existingMap, error: selectError } = await supabase
      .from('whatsapp_conversations_map')
      .select('conversation_id')
      .eq('sender_number', normalizedSenderNumber)
      .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116: Row not found
      console.error('Error fetching conversation map from Supabase:', selectError);
      throw selectError;
    }

    if (existingMap) {
      console.log(`Found existing conversation ID ${existingMap.conversation_id} for ${normalizedSenderNumber}`);
      // Ensure the conversation still exists in the main table, just in case.
      await ensureConversation(existingMap.conversation_id);
      return existingMap.conversation_id;
    }

    // 2. If no mapping exists, create a new one
    const newConversationId = uuidv4();
    console.log(`No existing conversation found for ${normalizedSenderNumber}. Creating new ID: ${newConversationId}`);

    // a. Ensure the conversation exists in the main 'conversations' table
    await ensureConversation(newConversationId);

    // b. Insert into whatsapp_conversations_map
    const { error: insertError } = await supabase
      .from('whatsapp_conversations_map')
      .insert({
        sender_number: normalizedSenderNumber,
        conversation_id: newConversationId,
      });

    if (insertError) {
      console.error('Error inserting new conversation map to Supabase:', insertError);
      throw insertError;
    }

    console.log(`Successfully created new conversation mapping for ${normalizedSenderNumber} with ID ${newConversationId}`);
    return newConversationId;

  } catch (error) {
    console.error(`Failed to get or create conversation ID for ${normalizedSenderNumber}:`, error);
    // Depending on how you want to handle errors, you might re-throw,
    // or return a specific error code or default/fallback conversation ID.
    // For now, re-throwing to let the caller handle it.
    throw error;
  }
}
