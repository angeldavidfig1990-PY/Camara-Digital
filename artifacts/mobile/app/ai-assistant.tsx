import React, { useState, useRef } from "react";
import {
  FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput,
  TouchableOpacity, View, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  "¿Quién es el presidente de la Cámara de Diputados?",
  "¿Quién integra la Comisión de Salud?",
  "¿Qué proyectos están en tratamiento?",
  "¿Qué leyes fueron aprobadas en 2025?",
  "¿Cuántos diputados hay por partido?",
  "¿Cuáles son las próximas sesiones?",
  "Información sobre el proyecto 128/2025",
];

function MessageBubble({ message }: { message: Message }) {
  const colors = useColors();
  const isUser = message.role === "user";

  return (
    <View style={[styles.bubbleWrap, isUser && styles.bubbleWrapUser]}>
      {!isUser && (
        <View style={[styles.aiAvatar, { backgroundColor: colors.accent + "18" }]}>
          <Ionicons name="sparkles" size={14} color={colors.accent} />
        </View>
      )}
      <View style={[
        styles.bubble,
        {
          backgroundColor: isUser ? colors.primary : colors.card,
          borderColor: isUser ? colors.primary : colors.border,
        }
      ]}>
        <Text style={[
          styles.bubbleText,
          { color: isUser ? colors.primaryForeground : colors.foreground }
        ]}>
          {message.content}
        </Text>
        <Text style={[
          styles.bubbleTime,
          { color: isUser ? "rgba(255,255,255,0.6)" : colors.mutedForeground }
        ]}>
          {message.timestamp.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    </View>
  );
}

export default function AIAssistantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hola, soy el Asistente Legislativo de la Cámara de Diputados del Paraguay.\n\nPuedo responder consultas sobre las autoridades (Mesa Directiva), diputados, comisiones, proyectos de ley, sesiones y leyes utilizando datos oficiales del Congreso Nacional.\n\n¿En qué puedo ayudarte?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const sendMessage = async (text: string) => {
    const question = text.trim();
    if (!question || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://192.168.31.146:3000";
      const res = await fetch(`${baseUrl}/api/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: question }),
      });
      
      if (res.ok) {
        const data = await res.json();
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.respuesta,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error("API error");
      }
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Lo siento, no pude procesar tu consulta en este momento. Por favor, intenta nuevamente.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headerIcon, { backgroundColor: colors.accent + "18" }]}>
            <Ionicons name="sparkles" size={16} color={colors.accent} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Asistente Legislativo</Text>
            <Text style={[styles.headerSub, { color: colors.success }]}>Con datos oficiales del Congreso</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          isLoading ? (
            <View style={styles.loadingBubble}>
              <View style={[styles.aiAvatar, { backgroundColor: colors.accent + "18" }]}>
                <Ionicons name="sparkles" size={14} color={colors.accent} />
              </View>
              <View style={[styles.bubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            </View>
          ) : null
        }
      />

      {/* Suggestions */}
      {messages.length <= 1 && (
        <View style={[styles.suggestions, { backgroundColor: colors.background }]}>
          <Text style={[styles.suggestTitle, { color: colors.mutedForeground }]}>Consultas frecuentes</Text>
          <FlatList
            data={SUGGESTIONS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={i => i}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.suggestion, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => sendMessage(item)}
                activeOpacity={0.8}
              >
                <Text style={[styles.suggestionText, { color: colors.foreground }]}>{item}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}
          />
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputRow, {
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        paddingBottom: botPad + 8,
      }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          value={input}
          onChangeText={setInput}
          placeholder="Escribe tu consulta legislativa..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage(input)}
        />
        <TouchableOpacity
          style={[styles.sendBtn, {
            backgroundColor: input.trim() && !isLoading ? colors.accent : colors.muted,
          }]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
          activeOpacity={0.85}
        >
          <Ionicons name="send" size={18} color={input.trim() && !isLoading ? "#FFF" : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  messageList: { paddingHorizontal: 16, paddingVertical: 16, gap: 12, flexGrow: 1 },
  bubbleWrap: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  bubbleWrapUser: { flexDirection: "row-reverse" },
  aiAvatar: { width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  bubble: { maxWidth: "80%", borderRadius: 16, borderWidth: 1, padding: 12, gap: 4 },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  bubbleTime: { fontSize: 11, fontFamily: "Inter_400Regular", alignSelf: "flex-end" },
  loadingBubble: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 4 },
  suggestions: { paddingTop: 8 },
  suggestTitle: { fontSize: 12, fontFamily: "Inter_500Medium", fontWeight: "500" as const, paddingHorizontal: 16, marginBottom: 2 },
  suggestion: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1,
    maxWidth: 240,
  },
  suggestionText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1,
  },
  input: {
    flex: 1, borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    maxHeight: 100, minHeight: 44,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
