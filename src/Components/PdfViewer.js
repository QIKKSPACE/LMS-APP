import React, { useState, useCallback } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';

function buildPdfHtml(uri) {
  const safeUri = uri.replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #0a0a0a; overflow: hidden; }
    embed, iframe, object { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <embed src="${safeUri}" type="application/pdf" width="100%" height="100%" />
</body>
</html>`;
}

function googleViewerUrl(uri) {
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(uri)}`;
}

const PdfViewer = ({ uri, style }) => {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('direct');
  const [failed, setFailed] = useState(false);

  const handleError = useCallback(() => {
    if (mode === 'direct') {
      setMode('gview');
      setLoading(true);
      setFailed(false);
    } else if (mode === 'gview' && Platform.OS === 'android') {
      setMode('embed');
      setLoading(true);
      setFailed(false);
    } else {
      setLoading(false);
      setFailed(true);
    }
  }, [mode]);

  if (!uri) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>PDF URL is missing</Text>
      </View>
    );
  }

  if (failed) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <Text style={styles.errorText}>Could not load PDF in the app</Text>
        <TouchableOpacity
          style={styles.fallbackBtn}
          onPress={() => Linking.openURL(uri).catch(() => {})}
        >
          <Text style={styles.fallbackBtnText}>Open in browser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const webViewSource =
    mode === 'gview'
      ? { uri: googleViewerUrl(uri) }
      : mode === 'embed'
        ? { html: buildPdfHtml(uri), baseUrl: '' }
        : { uri };

  return (
    <View style={[styles.container, style]}>
      <WebView
        key={mode}
        source={webViewSource}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        allowsInlineMediaPlayback
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={handleError}
        onHttpError={handleError}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  webview: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
  },
  errorText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  fallbackBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  fallbackBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});

export default PdfViewer;
