package bh.hayati.app;

import android.content.Context;
import android.content.Intent;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * «ودجت حياتي» (DW-031): الواجهة ترسل لقطة JSON صغيرة، ننحفظها بـ SharedPreferences الخاصة بالتطبيق ونحدّث الودجت.
 * وأزرار الودجت («+ مصروف»، «الصق رسالة») تفتح التطبيق بـ extra اسمه hayati_action يوصل للواجهة.
 */
@CapacitorPlugin(name = "HayatiWidget")
public class WidgetPlugin extends Plugin {

    static final String PREFS = "hayati_widget";
    static final String EXTRA = "hayati_action";
    static final int MAX = 20000;
    private String pending;

    @Override
    public void load() {
        pending = actionOf(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        String name = actionOf(intent);
        if (name == null) return;
        if (hasListeners("action")) {
            JSObject data = new JSObject();
            data.put("name", name);
            notifyListeners("action", data);
        } else {
            pending = name;
        }
    }

    @PluginMethod
    public void update(PluginCall call) {
        String data = call.getString("data");
        if (data == null || data.length() > MAX) { call.reject("bad data"); return; }
        Context ctx = getContext();
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("data", data).apply();
        HayatiWidget.refresh(ctx);
        Log.i("Hayati", "hayati-widget:updated");
        call.resolve();
    }

    @PluginMethod
    public void take(PluginCall call) {
        JSObject result = new JSObject();
        if (pending != null) result.put("name", pending);
        pending = null;
        call.resolve(result);
    }

    static String actionOf(Intent intent) {
        if (intent == null) return null;
        String name = intent.getStringExtra(EXTRA);
        if ("add-tx".equals(name) || "paste-sms".equals(name) || "ask".equals(name)) {   // ask: اختصار الأيقونة (DW-048)
            intent.removeExtra(EXTRA);   // ما يتكرر لو النشاط انعاد إنشاؤه
            return name;
        }
        return null;
    }
}
