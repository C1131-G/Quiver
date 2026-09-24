import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import type { TextInput } from "react-native";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { z } from "zod";

import { EyeIcon, EyeOffIcon, StyledSafeAreaView } from "@/components/styled";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { supabaseEnv } from "@/lib/env";

import { NOT_CONFIGURED, signIn } from "./auth-store";

const CONNECTION_ERROR =
  "Could not sign in. Check your connection and try again.";

const signInSchema = z.object({
  password: z.string().min(1, "Enter your password."),
  username: z
    .string()
    .trim()
    .min(3, "Usernames are at least 3 characters.")
    .max(64, "Usernames are at most 64 characters."),
});

/** A validator error is a schema issue or a plain message. */
const fieldErrorSchema = z
  .object({ message: z.string() })
  .or(z.string().transform((message) => ({ message })));

const firstError = (errors: readonly unknown[]) => {
  const parsed = fieldErrorSchema.safeParse(errors[0]);
  return parsed.success ? parsed.data.message : null;
};

const FieldError = ({ message }: { message: string | null }) =>
  message ? (
    <Text role="alert" variant="error">
      {message}
    </Text>
  ) : null;

const PasswordToggle = ({
  onToggle,
  visible,
}: {
  onToggle: () => void;
  visible: boolean;
}) => (
  <Pressable
    aria-checked={visible}
    aria-label="Show password"
    className="border-input active:bg-accent h-12 w-12 items-center justify-center border"
    onPress={onToggle}
    role="switch"
  >
    {visible ? (
      <EyeOffIcon colorClassName="accent-muted-foreground" size={20} />
    ) : (
      <EyeIcon colorClassName="accent-muted-foreground" size={20} />
    )}
  </Pressable>
);

export const SignInForm = () => {
  const passwordRef = useRef<TextInput>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(
    supabaseEnv ? null : NOT_CONFIGURED
  );

  const form = useForm({
    defaultValues: { password: "", username: "" },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      // On success the root layout switches to the signed-in screens.
      setSubmitError(await signIn(value.username.trim(), value.password));
    },
    validators: { onSubmit: signInSchema },
  });

  const submit = async () => {
    try {
      await form.handleSubmit();
    } catch {
      setSubmitError(CONNECTION_ERROR);
    }
  };

  return (
    <StyledSafeAreaView className="bg-background flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-center px-6"
      >
        <View className="mb-8 gap-1">
          <Text className="text-center" variant="h3">
            QuiverScore
          </Text>
          <Text className="text-center" variant="muted">
            Sign in with your scorer account
          </Text>
        </View>

        <View className="gap-5">
          <form.Field name="username">
            {(field) => (
              <View className="gap-2">
                <Label nativeID="username-label">Username</Label>
                <Input
                  accessibilityLabelledBy="username-label"
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect={false}
                  className="h-12"
                  maxLength={64}
                  onBlur={field.handleBlur}
                  onChangeText={field.handleChange}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  returnKeyType="next"
                  submitBehavior="submit"
                  textContentType="username"
                  value={field.state.value}
                />
                <FieldError message={firstError(field.state.meta.errors)} />
              </View>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <View className="gap-2">
                <Label nativeID="password-label">Password</Label>
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Input
                      accessibilityLabelledBy="password-label"
                      autoCapitalize="none"
                      autoComplete="current-password"
                      autoCorrect={false}
                      className="h-12"
                      onBlur={field.handleBlur}
                      onChangeText={field.handleChange}
                      onSubmitEditing={submit}
                      ref={passwordRef}
                      returnKeyType="go"
                      secureTextEntry={!passwordVisible}
                      textContentType="password"
                      value={field.state.value}
                    />
                  </View>
                  <PasswordToggle
                    onToggle={() => setPasswordVisible((visible) => !visible)}
                    visible={passwordVisible}
                  />
                </View>
                <FieldError message={firstError(field.state.meta.errors)} />
              </View>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                aria-busy={isSubmitting}
                className="h-12"
                disabled={isSubmitting || !supabaseEnv}
                onPress={submit}
                size="lg"
              >
                <Text>{isSubmitting ? "Signing in…" : "Sign in"}</Text>
              </Button>
            )}
          </form.Subscribe>

          <FieldError message={submitError} />
        </View>
      </KeyboardAvoidingView>
    </StyledSafeAreaView>
  );
};
