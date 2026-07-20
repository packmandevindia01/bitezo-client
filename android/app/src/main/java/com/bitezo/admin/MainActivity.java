package com.bitezo.admin;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BitezoPrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
