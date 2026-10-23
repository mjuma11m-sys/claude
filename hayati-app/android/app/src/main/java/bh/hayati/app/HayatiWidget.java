package bh.hayati.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;
import java.io.File;
import java.io.FileOutputStream;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * «ودجت حياتي» على الشاشة الرئيسية (DW-031). يعرض اللقطة اللي حفظتها الواجهة (WidgetPlugin):
 * سطر الميزانية، وأقرب شي جاي (يختاره هني حسب الوقت، فيظل صحيح حتى لو التطبيق مسكّر)، وزرّين.
 * لو القفل شغّال، الواجهة ترسل locked=true وما نعرض أي بيانات.
 */
public class HayatiWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        RemoteViews views = build(ctx);
        for (int id : ids) mgr.updateAppWidget(id, views);
        preview(ctx, views);
    }

    /** يحدّث الودجتين (الكبير والصغير DW-039) من نفس اللقطة */
    static void refresh(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, HayatiWidget.class));
        RemoteViews views = build(ctx);
        for (int id : ids) mgr.updateAppWidget(id, views);
        preview(ctx, views);
        HayatiWidgetSmall.refresh(ctx);
    }

    static void preview(Context ctx, RemoteViews views) {
        preview(ctx, views, "widget-preview.png", "hayati-widget", 320, 170);
    }

    /**
     * نسخة الاختبار (debug) بس: نرسم الودجت داخل التطبيق ونحفظه صورة، عشان فحص المحاكي يتأكد إن التصميم
     * ينفتح بدون خطأ (غلط بالـ layout يطلع بس بالشاشة الرئيسية: «ما قدرنا نحمّل الودجت») ويصوّره.
     */
    static void preview(Context ctx, RemoteViews views, String file, String tag, int wDp, int hDp) {
        if ((ctx.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) == 0) return;
        try {
            Context app = ctx.getApplicationContext();
            View view = views.apply(app, null);
            float d = app.getResources().getDisplayMetrics().density;
            int w = (int) (wDp * d), h = (int) (hDp * d);
            view.measure(View.MeasureSpec.makeMeasureSpec(w, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(h, View.MeasureSpec.EXACTLY));
            view.layout(0, 0, w, h);
            Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
            view.draw(new Canvas(bmp));
            try (FileOutputStream out = new FileOutputStream(new File(app.getFilesDir(), file))) {
                bmp.compress(Bitmap.CompressFormat.PNG, 100, out);
            }
            Log.i("Hayati", tag + ":inflate ok");
        } catch (Exception e) {
            Log.e("Hayati", tag + ":inflate fail " + e);
        }
    }

    static JSONObject snap(Context ctx) {
        try {
            String raw = ctx.getSharedPreferences(WidgetPlugin.PREFS, Context.MODE_PRIVATE).getString("data", null);
            return raw == null ? null : new JSONObject(raw);
        } catch (Exception e) {
            return null;
        }
    }

    static RemoteViews build(Context ctx) {
        JSONObject snap = snap(ctx);
        boolean rtl = snap == null || snap.optBoolean("rtl", true);
        RemoteViews v = new RemoteViews(ctx.getPackageName(), rtl ? R.layout.hayati_widget : R.layout.hayati_widget_ltr);

        v.setOnClickPendingIntent(R.id.wg_root, open(ctx, null, 0));
        v.setOnClickPendingIntent(R.id.wg_add, open(ctx, "add-tx", 1));
        v.setOnClickPendingIntent(R.id.wg_paste, open(ctx, "paste-sms", 2));

        if (snap == null) {
            // ما انفتح التطبيق للحين: النصوص الافتراضية من strings.xml
            v.setViewVisibility(R.id.wg_bar, View.GONE);
            v.setViewVisibility(R.id.wg_sub, View.GONE);
            Log.i("Hayati", "hayati-widget:render empty");
            return v;
        }
        JSONObject labels = snap.optJSONObject("labels");
        if (labels == null) labels = new JSONObject();
        v.setTextViewText(R.id.wg_add, labels.optString("add", "+"));
        v.setTextViewText(R.id.wg_paste, labels.optString("paste", ""));

        if (snap.optBoolean("locked", false)) {
            v.setTextViewText(R.id.wg_budget, labels.optString("locked", "🔒"));
            v.setViewVisibility(R.id.wg_bar, View.GONE);
            v.setTextViewText(R.id.wg_label, "");
            v.setTextViewText(R.id.wg_title, "");
            v.setViewVisibility(R.id.wg_sub, View.GONE);
            Log.i("Hayati", "hayati-widget:render locked");
            return v;
        }

        JSONObject budget = snap.optJSONObject("budget");
        int pct = budget == null ? -1 : budget.optInt("pct", -1);
        v.setTextViewText(R.id.wg_budget, budget == null ? "" : budget.optString("line", ""));
        if (pct >= 0) {
            v.setViewVisibility(R.id.wg_bar, View.VISIBLE);
            v.setProgressBar(R.id.wg_bar, 100, pct, false);
        } else {
            v.setViewVisibility(R.id.wg_bar, View.GONE);
        }

        // أقرب شي جاي من الحين (اللي بدأ قبل أقل من نص ساعة يظل ظاهر)
        JSONObject next = null;
        long now = System.currentTimeMillis();
        JSONArray items = snap.optJSONArray("items");
        if (items != null) {
            for (int i = 0; i < items.length(); i++) {
                JSONObject it = items.optJSONObject(i);
                if (it != null && it.optLong("t", 0) > now - 30 * 60 * 1000L) { next = it; break; }
            }
        }
        if (next == null) {
            v.setTextViewText(R.id.wg_label, labels.optString("next", ""));
            v.setTextViewText(R.id.wg_title, labels.optString("none", ""));
            v.setViewVisibility(R.id.wg_sub, View.GONE);
        } else {
            boolean tomorrow = !sameDay(next.optLong("t"), now);
            String when = (tomorrow ? labels.optString("tomorrow", "") + " · " : "") + next.optString("time", "");
            v.setTextViewText(R.id.wg_label, labels.optString("next", "") + " · " + when);
            v.setTextViewText(R.id.wg_title, next.optString("title", ""));
            String sub = next.optString("sub", "");
            v.setTextViewText(R.id.wg_sub, sub);
            v.setViewVisibility(R.id.wg_sub, sub.isEmpty() ? View.GONE : View.VISIBLE);
        }
        Log.i("Hayati", "hayati-widget:render ok");
        return v;
    }

    static boolean sameDay(long a, long b) {
        java.util.Calendar x = java.util.Calendar.getInstance(), y = java.util.Calendar.getInstance();
        x.setTimeInMillis(a);
        y.setTimeInMillis(b);
        return x.get(java.util.Calendar.YEAR) == y.get(java.util.Calendar.YEAR) && x.get(java.util.Calendar.DAY_OF_YEAR) == y.get(java.util.Calendar.DAY_OF_YEAR);
    }

    static PendingIntent open(Context ctx, String action, int code) {
        Intent i = new Intent(ctx, MainActivity.class);
        i.setAction("bh.hayati.app.WIDGET_" + code);   // كل زر له PendingIntent مختلف
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (action != null) i.putExtra(WidgetPlugin.EXTRA, action);
        return PendingIntent.getActivity(ctx, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
