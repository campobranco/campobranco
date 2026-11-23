package com.campobranco.app;

import android.content.Intent;
import android.net.Uri;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends BridgeActivity {
    private static final Set<String> ALLOWED_HOSTS = new HashSet<>(Arrays.asList(
        "campobranco.web.app",
        "campo-branco.web.app",
        "campobrancodev.web.app"
    ));

    @Override
    public void onStart() {
        super.onStart();
        handleAppLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleAppLink(intent);
    }

    private void handleAppLink(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) {
            return;
        }

        Uri data = intent.getData();
        if (data == null || !"https".equalsIgnoreCase(data.getScheme())) {
            return;
        }

        String host = data.getHost();
        if (host == null || !ALLOWED_HOSTS.contains(host.toLowerCase())) {
            return;
        }

        String path = data.getEncodedPath();
        String safePath = (path != null && path.startsWith("/")) ? path : "/";
        String query = data.getEncodedQuery();
        final String targetUrl = "https://localhost" + safePath + (query != null && !query.isEmpty() ? "?" + query : "");

        // Consome o intent para evitar re-navegacao ao retornar de background
        setIntent(new Intent());

        if (getBridge() != null && getBridge().getWebView() != null) {
            final WebView webView = getBridge().getWebView();
            webView.post(() -> webView.loadUrl(targetUrl));
        }
    }
}
