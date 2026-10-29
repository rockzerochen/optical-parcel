package cn.rockzero.opticalparcel;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

/** Native offline host for the shared Cimbar/QR codec, MIT. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/assets/optical/index.html";
    private static final int CAMERA_REQUEST=401, OPEN_REQUEST=402, SAVE_REQUEST=403;
    private static final int DARK=0xff0b1522, CARD=0xff142338, TEAL=0xff6ce4cc;
    private FrameLayout container;
    private LinearLayout normal;
    private WebView web;
    private View fullView;
    private WebChromeClient.CustomViewCallback fullCallback;
    private PermissionRequest cameraRequest;
    private ValueCallback<Uri[]> chooserCallback;
    private byte[] pendingSave;
    private Button[] tabs = new Button[4];
    private int selected=0;
    private boolean pageReady=false;
    private volatile String lastError="无";

    private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private GradientDrawable background(int color){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(10));return d;}
    @SuppressLint({"SetJavaScriptEnabled","AddJavascriptInterface"})
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(DARK);getWindow().setNavigationBarColor(DARK);
        container=new FrameLayout(this);container.setBackgroundColor(DARK);
        normal=new LinearLayout(this);normal.setOrientation(LinearLayout.VERTICAL);normal.setBackgroundColor(DARK);
        container.addView(normal,new FrameLayout.LayoutParams(-1,-1));setContentView(container);
        if(Build.VERSION.SDK_INT>=35){
            getWindow().setDecorFitsSystemWindows(false);
            normal.setOnApplyWindowInsetsListener((v,insets)->{android.graphics.Insets b=insets.getInsets(WindowInsets.Type.systemBars());normal.setPadding(b.left,b.top,b.right,Math.max(b.bottom,insets.getInsets(WindowInsets.Type.ime()).bottom));return insets;});
        }
        LinearLayout top=new LinearLayout(this);top.setGravity(Gravity.CENTER_VERTICAL);top.setPadding(dp(14),dp(4),dp(8),dp(4));
        TextView title=new TextView(this);title.setText("光邮离线 2.0");title.setTextColor(TEAL);title.setTextSize(19);top.addView(title,new LinearLayout.LayoutParams(0,dp(46),1));title.setGravity(Gravity.CENTER_VERTICAL);
        Button help=new Button(this);help.setAllCaps(false);help.setText("帮助");help.setTextColor(Color.WHITE);help.setBackground(background(CARD));help.setOnClickListener(v->about());top.addView(help,new LinearLayout.LayoutParams(dp(66),dp(40)));normal.addView(top);
        try{web=new WebView(this);}catch(Exception unavailable){lastError=String.valueOf(unavailable.getMessage());TextView error=new TextView(this);error.setText("系统 WebView 不可用。\n请启用或更新系统 WebView 后重新打开应用。\n\n可点击上方帮助查看诊断。");error.setTextColor(Color.WHITE);error.setTextSize(16);error.setPadding(dp(20),dp(24),dp(20),dp(24));normal.addView(error);return;}
        web.setBackgroundColor(DARK);normal.addView(web,new LinearLayout.LayoutParams(-1,0,1));
        WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setDefaultTextEncodingName("UTF-8");s.setMediaPlaybackRequiresUserGesture(false);s.setAllowFileAccess(false);s.setAllowContentAccess(true);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setBlockNetworkLoads(true);s.setCacheMode(WebSettings.LOAD_NO_CACHE);s.setTextZoom(100);s.setSupportZoom(false);s.setBuiltInZoomControls(false);s.setDisplayZoomControls(false);s.setSupportMultipleWindows(false);
        if(Build.VERSION.SDK_INT>=33)s.setAlgorithmicDarkeningAllowed(false);else if(Build.VERSION.SDK_INT>=29)s.setForceDark(WebSettings.FORCE_DARK_OFF);
        WebView.setWebContentsDebuggingEnabled(false);
        web.addJavascriptInterface(new Bridge(),"OpticalAndroid");
        web.setWebViewClient(new LocalClient());web.setWebChromeClient(new Chrome());
        web.setDownloadListener((url,ua,disposition,mime,length)->notifyStatus("请使用页面上的保存按钮，通过系统文件窗口保存。"));
        LinearLayout bar=new LinearLayout(this);bar.setGravity(Gravity.CENTER);bar.setPadding(dp(5),dp(6),dp(5),dp(6));
        String[] names={"收文件","发文件","扫文本","制文本"};for(int i=0;i<4;i++){final int index=i;Button b=new Button(this);tabs[i]=b;b.setText(names[i]);b.setAllCaps(false);b.setTextSize(13);b.setPadding(dp(2),0,dp(2),0);b.setMinWidth(0);b.setMinHeight(dp(48));b.setOnClickListener(v->select(index));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,dp(48),1);lp.setMargins(dp(3),0,dp(3),0);bar.addView(b,lp);}normal.addView(bar);paintTabs();
        if(state!=null)selected=state.getInt("selected",0);
        web.loadUrl(HOME);
    }
    private boolean trusted(Uri u){return u!=null&&"https".equals(u.getScheme())&&HOST.equals(u.getHost())&&(u.getPort()==-1||u.getPort()==443);}
    private void paintTabs(){for(int i=0;i<tabs.length;i++)if(tabs[i]!=null){tabs[i].setBackground(background(i==selected?TEAL:CARD));tabs[i].setTextColor(i==selected?DARK:Color.WHITE);}}
    private void select(int index){selected=index;paintTabs();if(pageReady)web.evaluateJavascript("window.OpticalHost&&OpticalHost.selectTab("+index+")",null);}
    private WebResourceResponse errorResponse(int code){return new WebResourceResponse("text/plain","UTF-8",code,code==404?"Not Found":"Blocked",Collections.singletonMap("Cache-Control","no-store"),new ByteArrayInputStream(new byte[0]));}
    private final class LocalClient extends WebViewClient {
        @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
            Uri u=request.getUrl();if(!trusted(u)||!"GET".equals(request.getMethod()))return errorResponse(403);
            String path=u.getPath();if(path==null||!path.startsWith("/assets/optical/")||path.contains("..")||path.contains("\\"))return errorResponse(404);
            String name=path.substring("/assets/".length());try{InputStream in=getAssets().open(name);String mime=name.endsWith(".html")?"text/html":name.endsWith(".txt")?"text/plain":"application/octet-stream";return new WebResourceResponse(mime,"UTF-8",200,"OK",Collections.singletonMap("Cache-Control","no-store"),in);}catch(Exception e){return errorResponse(404);}
        }
        @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !trusted(request.getUrl());}
        @Override public void onPageFinished(WebView view,String url){if(HOME.equals(url)){pageReady=true;select(selected);}}
        @Override public void onReceivedError(WebView view,WebResourceRequest request,android.webkit.WebResourceError error){if(request.isForMainFrame()){lastError=String.valueOf(error.getDescription());notifyStatus("页面加载失败，请打开帮助查看诊断。");}}
    }
    private final class Chrome extends WebChromeClient {
        @Override public void onPermissionRequest(final PermissionRequest request){runOnUiThread(()->{
            if(!trusted(request.getOrigin())||!java.util.Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)){request.deny();return;}
            if(cameraRequest!=null)cameraRequest.deny();cameraRequest=request;
            if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED){request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});cameraRequest=null;}else requestPermissions(new String[]{Manifest.permission.CAMERA},CAMERA_REQUEST);
        });}
        @Override public void onPermissionRequestCanceled(PermissionRequest request){runOnUiThread(()->{if(cameraRequest==request)cameraRequest=null;});}
        @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
            if(chooserCallback!=null)chooserCallback.onReceiveValue(null);chooserCallback=callback;
            Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);String[] types=params.getAcceptTypes();String type="*/*";if(types!=null&&types.length==1&&types[0]!=null&&!types[0].isEmpty())type=types[0];intent.setType(type);
            try{startActivityForResult(intent,OPEN_REQUEST);}catch(Exception e){chooserCallback.onReceiveValue(null);chooserCallback=null;notifyStatus("此设备没有可用的文件选择器。");}return true;
        }
        @Override public void onShowCustomView(View view,CustomViewCallback callback){if(fullView!=null){callback.onCustomViewHidden();return;}fullView=view;fullCallback=callback;normal.setVisibility(View.GONE);container.addView(view,new FrameLayout.LayoutParams(-1,-1));getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);}
        @Override public void onHideCustomView(){hideFull();}
        @Override public boolean onConsoleMessage(ConsoleMessage message){if(message.messageLevel()==ConsoleMessage.MessageLevel.ERROR)lastError=message.message()+" (line "+message.lineNumber()+")";return true;}
    }
    private void hideFull(){if(fullView!=null){container.removeView(fullView);fullView=null;normal.setVisibility(View.VISIBLE);getWindow().getDecorView().setSystemUiVisibility(0);if(fullCallback!=null)fullCallback.onCustomViewHidden();fullCallback=null;}}
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results){super.onRequestPermissionsResult(request,permissions,results);if(request==CAMERA_REQUEST&&cameraRequest!=null){PermissionRequest p=cameraRequest;cameraRequest=null;if(results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED&&trusted(p.getOrigin()))p.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});else{p.deny();notifyStatus("未获得摄像头权限，可在帮助中的应用设置里开启。");}}}
    public final class Bridge {
        @JavascriptInterface public void copyText(String text){if(text==null||text.length()>3000000)return;runOnUiThread(()->{((ClipboardManager)getSystemService(CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText("光邮文本",text));notifyStatus("已复制文本");});}
        @JavascriptInterface public void saveBase64(String name,String mime,String payload){
            if(payload==null||payload.length()>12*1024*1024){runOnUiThread(()->notifyStatus("保存内容超过应用限制"));return;}
            try{final byte[] bytes=Base64.decode(payload,Base64.DEFAULT);if(bytes.length>8*1024*1024)throw new IllegalArgumentException();final String filename=(name==null||name.isEmpty()?"received.bin":name).replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]","_");final String contentType=mime!=null&&mime.matches("[A-Za-z0-9.+-]+/[A-Za-z0-9.+-]+")?mime:"application/octet-stream";
                runOnUiThread(()->{if(pendingSave!=null){notifyStatus("请先完成当前保存操作");return;}pendingSave=bytes;Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType(contentType);intent.putExtra(Intent.EXTRA_TITLE,filename);try{startActivityForResult(intent,SAVE_REQUEST);}catch(Exception e){pendingSave=null;notifyStatus("无法打开系统保存窗口");}});
            }catch(Exception e){runOnUiThread(()->notifyStatus("保存数据无效"));}
        }
        @JavascriptInterface public void reportError(String text){if(text!=null)lastError=text.substring(0,Math.min(1500,text.length()));}
    }
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);
        if(request==OPEN_REQUEST&&chooserCallback!=null){ValueCallback<Uri[]> cb=chooserCallback;chooserCallback=null;cb.onReceiveValue(result==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);}
        if(request==SAVE_REQUEST){final byte[] bytes=pendingSave;pendingSave=null;final Uri uri=data==null?null:data.getData();if(result!=RESULT_OK||uri==null||bytes==null){notifyStatus("已取消保存");return;}new Thread(()->{try(OutputStream out=getContentResolver().openOutputStream(uri,"w")){if(out==null)throw new java.io.IOException();out.write(bytes);out.flush();runOnUiThread(()->notifyStatus("文件已保存"));}catch(Exception e){runOnUiThread(()->notifyStatus("文件保存失败，请重试"));}},"optical-save").start();}
    }
    private void notifyStatus(String text){Toast.makeText(this,text,Toast.LENGTH_SHORT).show();if(web!=null&&pageReady)web.evaluateJavascript("window.OpticalHost&&OpticalHost.notify("+JSONObject.quote(text)+")",null);}
    private String readAsset(String name)throws Exception{try(InputStream in=getAssets().open(name);ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);return new String(out.toByteArray(),StandardCharsets.UTF_8);}}
    private void about(){PackageInfo info=WebView.getCurrentWebViewPackage();String engine=info==null?"未知":info.packageName+" "+info.versionName;String message="安卓原生宿主 2.0.0\n网页功能 1.4 / 低密度核心 1.3\nAndroid "+Build.VERSION.RELEASE+" (API "+Build.VERSION.SDK_INT+")\nWebView: "+engine+"\n\nCimbar 收发两端请选择相同模式。普通二维码只传文本。\n\n应用完全离线，不申请联网权限。保存时请选择系统文件位置；摄像头只在前台工作。切到后台会停止接收，当前未完成进度将清空。请保持应用前台和屏幕常亮。\n\n建议使用较新的系统 WebView；过旧版本可能不支持 WASM 或摄像头。\n\n最近诊断："+lastError;
        new AlertDialog.Builder(this).setTitle("光邮离线 · 帮助与诊断").setMessage(message).setPositiveButton("关闭",null).setNeutralButton("应用权限",(d,w)->startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getPackageName())))).setNegativeButton("许可",(d,w)->licenses()).show();
    }
    private void licenses(){try{TextView t=new TextView(this);t.setText(readAsset("optical/licenses.txt"));t.setTextIsSelectable(true);t.setPadding(dp(16),dp(12),dp(16),dp(12));ScrollView scroll=new ScrollView(this);scroll.addView(t);new AlertDialog.Builder(this).setTitle("开源许可").setView(scroll).setPositiveButton("关闭",null).show();}catch(Exception e){notifyStatus("许可文件读取失败");}}
    @Override public void onBackPressed(){if(fullView!=null){hideFull();return;}new AlertDialog.Builder(this).setTitle("退出光邮？").setMessage("未完成的接收进度会丢失。").setPositiveButton("退出",(d,w)->finish()).setNegativeButton("取消",null).show();}
    @Override protected void onSaveInstanceState(Bundle state){state.putInt("selected",selected);super.onSaveInstanceState(state);}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override protected void onPause(){if(web!=null)web.onPause();super.onPause();}
    @Override protected void onStop(){if(web!=null&&pageReady&&cameraRequest==null)web.evaluateJavascript("window.OpticalHost&&OpticalHost.background()",null);super.onStop();}
    @Override protected void onDestroy(){if(cameraRequest!=null)cameraRequest.deny();if(chooserCallback!=null)chooserCallback.onReceiveValue(null);if(web!=null){web.removeJavascriptInterface("OpticalAndroid");web.destroy();web=null;}pendingSave=null;super.onDestroy();}
}
