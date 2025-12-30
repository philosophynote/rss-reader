import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  VStack,
  Text,
  Code,
  Collapse,
  useDisclosure,
} from "@chakra-ui/react";
import { ApiAuthError, ApiError } from "../api";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * エラーバウンダリーコンポーネント
 * React内で発生したエラーをキャッチして、ユーザーフレンドリーなエラー画面を表示
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorDisplay
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * エラー表示コンポーネント
 */
interface ErrorDisplayProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onRetry: () => void;
}

function ErrorDisplay({ error, errorInfo, onRetry }: ErrorDisplayProps) {
  const { isOpen, onToggle } = useDisclosure();

  const getErrorMessage = (
    error: Error | null
  ): { title: string; description: string; status: "error" | "warning" } => {
    if (!error) {
      return {
        title: "予期しないエラー",
        description: "予期しないエラーが発生しました。",
        status: "error",
      };
    }

    if (error instanceof ApiAuthError) {
      return {
        title: "認証エラー",
        description:
          error.message || "API認証に失敗しました。設定を確認してください。",
        status: "warning",
      };
    }

    if (error instanceof ApiError) {
      return {
        title: "API通信エラー",
        description:
          error.message || "サーバーとの通信でエラーが発生しました。",
        status: "error",
      };
    }

    return {
      title: "アプリケーションエラー",
      description: error.message || "アプリケーションでエラーが発生しました。",
      status: "error",
    };
  };

  const { title, description, status } = getErrorMessage(error);

  return (
    <Box p={6} maxW="600px" mx="auto" mt={8}>
      <VStack spacing={4} align="stretch">
        <Alert status={status} borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{description}</AlertDescription>
          </Box>
        </Alert>

        <VStack spacing={3}>
          <Button colorScheme="blue" onClick={onRetry}>
            再試行
          </Button>

          <Button variant="ghost" size="sm" onClick={onToggle}>
            {isOpen ? "詳細を隠す" : "詳細を表示"}
          </Button>

          <Collapse in={isOpen} animateOpacity>
            <Box p={4} bg="gray.50" borderRadius="md" fontSize="sm">
              {error && (
                <VStack spacing={2} align="stretch">
                  <Text fontWeight="bold">エラー名:</Text>
                  <Code p={2} bg="white" borderRadius="sm">
                    {error.name}
                  </Code>

                  <Text fontWeight="bold">エラーメッセージ:</Text>
                  <Code p={2} bg="white" borderRadius="sm">
                    {error.message}
                  </Code>

                  {error.stack && (
                    <>
                      <Text fontWeight="bold">スタックトレース:</Text>
                      <Code
                        p={2}
                        bg="white"
                        borderRadius="sm"
                        whiteSpace="pre-wrap"
                        fontSize="xs"
                      >
                        {error.stack}
                      </Code>
                    </>
                  )}

                  {errorInfo?.componentStack && (
                    <>
                      <Text fontWeight="bold">コンポーネントスタック:</Text>
                      <Code
                        p={2}
                        bg="white"
                        borderRadius="sm"
                        whiteSpace="pre-wrap"
                        fontSize="xs"
                      >
                        {errorInfo.componentStack}
                      </Code>
                    </>
                  )}
                </VStack>
              )}
            </Box>
          </Collapse>
        </VStack>
      </VStack>
    </Box>
  );
}

/**
 * 認証エラー専用のエラーバウンダリー
 */
export function AuthErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <Box p={6} maxW="400px" mx="auto" mt={8}>
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>認証が必要です</AlertTitle>
              <AlertDescription>
                API Keyが設定されていないか、無効です。
                環境変数VITE_API_KEYを確認してください。
              </AlertDescription>
            </Box>
          </Alert>
        </Box>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
