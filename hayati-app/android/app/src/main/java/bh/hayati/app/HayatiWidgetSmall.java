package bh.hayati.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONObject;

/**
 * الودجت الصغير 2×2 (DW-039): رقم واحد كبير من نفس لقطة الودجت الكبير (حقل small)، وزر «+ مصروف».
 * القفل شغّال ← 🔒 بس، والزر يظل (يفتح التطبيق والقفل يطلب الرمز).
 */
public class HayatiWidgetSmall extends AppWidgetProvider {

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        RemoteViews views = build(ctx);
        for (int id : ids) mgr.updateAppWidget(id, views);
        HayatiWidget.preview(ctx, views, "widget-small-preview.png", "hayati-widget-small", 160, 160);
    }

    static void refresh(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, HayatiWidgetSmall.class));
        RemoteViews views = build(ctx);
        for (int id : ids) mgr.updateAppWidget(id, views);
        HayatiWidget.preview(ctx, views, "widget-small-preview.png", "hayati-widget-small", 160, 160);
    }

    static RemoteViews build(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.hayati_widget_small);
        v.setOnClickPendingIntent(R.id.ws_root, HayatiWidget.open(ctx, null, 10));
        v.setOnClickPendingIntent(R.id.ws_add, HayatiWidget.open(ctx, "add-tx", 11));
        JSONObject snap = HayatiWidget.snap(ctx);
        if (snap == null) { Log.i("Hayati", "hayati-widget-small:render empty"); return v; }
        JSONObject labels = snap.optJSONObject("labels");
        if (labels != null) v.setTextViewText(R.id.ws_add, labels.optString("add", "+"));
        JSONObject s = snap.optJSONObject("small");
        if (snap.optBoolean("locked", false) || s == null) {
            v.setTextViewText(R.id.ws_big, "🔒");
            v.setTextViewText(R.id.ws_cap, labels == null ? "" : labels.optString("locked", ""));
            v.setViewVisibility(R.id.ws_bar, View.GONE);
            Log.i("Hayati", "hayati-widget-small:render locked");
            return v;
        }
        v.setTextViewText(R.id.ws_big, s.optString("big", ""));
        v.setTextViewText(R.id.ws_cap, s.optString("cap", ""));
        int pct = s.optInt("pct", -1);
        if (pct >= 0) {
            v.setViewVisibility(R.id.ws_bar, View.VISIBLE);
            v.setProgressBar(R.id.ws_bar, 100, pct, false);
        } else {
            v.setViewVisibility(R.id.ws_bar, View.GONE);
        }
        Log.i("Hayati", "hayati-widget-small:render ok");
        return v;
    }
}
