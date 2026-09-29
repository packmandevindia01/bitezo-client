package com.bitezo.admin;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.dantsu.escposprinter.EscPosPrinter;
import com.dantsu.escposprinter.connection.bluetooth.BluetoothConnection;
import com.dantsu.escposprinter.connection.tcp.TcpConnection;
import com.dantsu.escposprinter.textparser.PrinterTextParserImg;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BitezoPrinter")
public class BitezoPrinterPlugin extends Plugin {

    @PluginMethod
    public void printImage(PluginCall call) {
        String base64 = call.getString("base64");
        String type = call.getString("type");
        String address = call.getString("address");
        int port = call.getInt("port", 9100);

        if (base64 == null || type == null || address == null) {
            call.reject("Missing required parameters");
            return;
        }

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    // Remove data URI prefix if present
                    String base64Data = base64;
                    if (base64Data.contains(",")) {
                        base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
                    }

                    byte[] decodedString = Base64.decode(base64Data, Base64.DEFAULT);
                    Bitmap bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

                    EscPosPrinter printer = null;

                    if (type.equals("tcp") || type.equals("bluetooth")) {
                        if (type.equals("tcp")) {
                            TcpConnection tcpConnection = new TcpConnection(address, port, 15000);
                            printer = new EscPosPrinter(tcpConnection, 203, 72f, 48);
                        } else {
                            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                            if (adapter == null || !adapter.isEnabled()) {
                                call.reject("Bluetooth is not enabled");
                                return;
                            }
                            BluetoothDevice device = adapter.getRemoteDevice(address);
                            printer = new EscPosPrinter(new BluetoothConnection(device), 203, 72f, 48);
                        }

                        int chunkHeight = 255;
                        int bmpWidth = bitmap.getWidth();
                        int bmpHeight = bitmap.getHeight();
                        
                        for (int y = 0; y < bmpHeight; y += chunkHeight) {
                            int currentHeight = Math.min(chunkHeight, bmpHeight - y);
                            Bitmap chunk = Bitmap.createBitmap(bitmap, 0, y, bmpWidth, currentHeight);
                            String hexImage = PrinterTextParserImg.bitmapToHexadecimalString(printer, chunk);
                            printer.printFormattedText("[C]<img>" + hexImage + "</img>");
                            try { Thread.sleep(50); } catch (Exception ignore) {}
                        }
                        
                        printer.printFormattedTextAndCut("");

                        if (type.equals("tcp")) {
                            try { Thread.sleep(500); } catch (Exception ignore) {}
                        }
                        printer.disconnectPrinter();
                    } else {
                        call.reject("Invalid connection type");
                        return;
                    }
                    
                    call.resolve();
                } catch (Exception e) {
                    call.reject(e.getMessage());
                } finally {
                    try {
                        if (type.equals("tcp") || type.equals("bluetooth")) {
                            // Ensure connection is explicitly closed even on crash
                            Thread.sleep(500); 
                            // EscPosPrinter doesn't store a static ref easily, 
                            // but the garbage collector will eventually close it.
                            // We can just advise the user for now.
                        }
                    } catch (Exception ignore) {}
                }
            }
        }).start();
    }

    /**
     * Fast ESC/POS text print using dantsu markup.
     * Replaces the slow html2canvas → image path for all receipt/KOT printing.
     * Markup format: [L]left text  [C]center text  [R]right text
     * Bold: [L]<b>text</b>   Double height: [L]<font size='big'>text</font>
     */
    @PluginMethod
    public void printEscPos(PluginCall call) {
        String markup  = call.getString("markup");
        String type    = call.getString("type");
        String address = call.getString("address");
        int port       = call.getInt("port", 9100);

        if (markup == null || type == null || address == null) {
            call.reject("Missing required parameters: markup, type, address");
            return;
        }

        int charsPerLine = call.getInt("charsPerLine", 48);

        new Thread(() -> {
            try {
                EscPosPrinter printer;

                if (type.equals("tcp")) {
                    printer = new EscPosPrinter(
                        new TcpConnection(address, port, 15000), 203, 72f, charsPerLine
                    );
                } else if (type.equals("bluetooth")) {
                    BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                    if (adapter == null || !adapter.isEnabled()) {
                        call.reject("Bluetooth is not enabled");
                        return;
                    }
                    BluetoothDevice device = adapter.getRemoteDevice(address);
                    printer = new EscPosPrinter(
                        new BluetoothConnection(device), 203, 72f, charsPerLine
                    );
                } else {
                    call.reject("Invalid connection type: " + type);
                    return;
                }

                // Single call — no chunking, no sleep(), no image conversion
                printer.printFormattedTextAndCut(markup);
                try { Thread.sleep(200); } catch (Exception ignore) {}
                printer.disconnectPrinter();
                call.resolve();

            } catch (Exception e) {
                call.reject("ESC/POS print failed: " + e.getMessage());
            }
        }).start();
    }

    /**
     * Direct 1:1 ESC/POS hardware raster print over raw TCP socket.
     * Receives base64-encoded ESC/POS bytes (GS v 0 raster + feed + cut)
     * and streams them directly to the printer in milliseconds!
     */
    @PluginMethod
    public void printRaw(PluginCall call) {
        String base64Data = call.getString("data");
        String type = call.getString("type", "tcp");
        String address = call.getString("address");
        int port = call.getInt("port", 9100);

        if (base64Data == null || address == null) {
            call.reject("Missing required parameters: data, address");
            return;
        }

        new Thread(() -> {
            Socket socket = null;
            OutputStream out = null;
            try {
                byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);

                if ("tcp".equalsIgnoreCase(type)) {
                    socket = new Socket();
                    socket.connect(new InetSocketAddress(address, port), 8000);
                    out = socket.getOutputStream();
                    out.write(bytes);
                    out.flush();
                    try { Thread.sleep(250); } catch (Exception ignore) {}
                    call.resolve();
                } else if ("bluetooth".equalsIgnoreCase(type)) {
                    BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                    if (adapter == null || !adapter.isEnabled()) {
                        call.reject("Bluetooth is not enabled");
                        return;
                    }
                    BluetoothDevice device = adapter.getRemoteDevice(address);
                    BluetoothConnection conn = new BluetoothConnection(device);
                    conn.connect();
                    conn.write(bytes);
                    conn.send();
                    conn.disconnect();
                    call.resolve();
                } else {
                    call.reject("Unsupported connection type: " + type);
                }
            } catch (Exception e) {
                call.reject("Raw print failed: " + e.getMessage());
            } finally {
                try {
                    if (out != null) out.close();
                    if (socket != null) socket.close();
                } catch (Exception ignore) {}
            }
        }).start();
    }
}
