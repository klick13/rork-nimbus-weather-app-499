import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { WeatherColors } from "@/constants/colors";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Root error boundary. Catches render-time crashes and shows the actual
 * error message + stack instead of Expo Go's generic "view error" red screen,
 * so the real cause is visible for diagnosis.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{error.message ?? String(error)}</Text>
          {error.stack ? (
            <Text style={styles.stack}>{error.stack}</Text>
          ) : null}
          <TouchableOpacity style={styles.button} onPress={this.handleReload}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070d",
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    color: WeatherColors.neonGreen,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
  },
  message: {
    color: "#ff5a5a",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    lineHeight: 22,
  },
  stack: {
    color: "#9fb3c8",
    fontSize: 12,
    fontFamily: "monospace",
    lineHeight: 16,
    marginBottom: 24,
  },
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(57, 255, 20, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(57, 255, 20, 0.4)",
  },
  buttonText: {
    color: WeatherColors.neonGreen,
    fontSize: 15,
    fontWeight: "700",
  },
});
