package bh.hayati.app;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * «شارك ← حياتي» (DW-009): نص رسالة البنك يوصل من تطبيق الرسائل.
 * ما نقرا الرسايل بروحنا (لا READ_SMS): المستخدم هو اللي يشارك، والتطبيق يفتح نافذة اللصق معبّاة.
 * فتح بارد: النص ينحفظ لين الواجهة تطلبه بـ take(). التطبيق مفتوح: يوصل بحدث "shared".
 */
@CapacitorPlugin(name = "ShareIn")
public class ShareInPlugin extends Plugin {

    static final int MAX = 2000;
    private String pending;

    @Override
    public void load() {
        pending = textOf(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        String text = textOf(intent);
        if (text == null) return;
        if (hasListeners("shared")) {
            JSObject data = new JSObject();
            data.put("text", text);
            notifyListeners("shared", data);
        } else {
            pending = text;
        }
    }

    @PluginMethod
    public void take(PluginCall call) {
        JSObject result = new JSObject();
        if (pending != null) result.put("text", pending);
        pending = null;
        call.resolve(result);
    }

    static String textOf(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return null;
        String type = intent.getType();
        if (type == null || !type.startsWith("text/")) return null;
        CharSequence text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
        if (text == null) text = intent.getCharSequenceExtra(Intent.EXTRA_SUBJECT);
        if (text == null) return null;
        String s = text.toString().trim();
        if (s.isEmpty()) return null;
        return s.length() > MAX ? s.substring(0, MAX) : s;
    }
}
