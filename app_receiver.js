const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const DEVICE_NAME = 'NRF_Receiver_B'; // 受信側ESP32のデバイス名

const connectButton = document.getElementById('connectButton');
const statusMessage = document.getElementById('statusMessage');
const receivedMessageDiv = document.getElementById('receivedMessage');
const logDiv = document.getElementById('log');

let bleCharacteristic;

function log(message, type = 'info') {
    const p = document.createElement('p');
    p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    p.style.color = type === 'error' ? 'red' : (type === 'success' ? 'green' : 'black');
    logDiv.prepend(p);
}

/**
 * BLE Characteristicの値が変化した際の処理（通知受信）
 */
function handleCharacteristicValueChanged(event) {
    const value = event.target.value; // DataView (バイト配列)
    
    // バイナリデータを文字列にデコード (UTF-8エンコーディングを使用)
    // ESP32側でNULL終端文字付きで送られているため、正しく日本語も復元される
    const decoder = new TextDecoder('utf-8');
    const receivedString = decoder.decode(value); 

    // 受信エリアを更新
    receivedMessageDiv.textContent = receivedString;
    log(`[新メッセージ] ${receivedString}`, 'success');
}


/**
 * BLEデバイスに接続を試みる
 */
async function connectToDevice() {
    log('接続を試みます...');
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: DEVICE_NAME }], // デバイス名でフィルタリング
            // 🚨 検出できない場合は上記をコメントアウトし、下記を使用:
            // acceptAllDevices: true,
            optionalServices: [SERVICE_UUID] 
        });
        
        log(`デバイス "${device.name}" を検出しました。接続中...`, 'success');

        const server = await device.gatt.connect();
        log('GATTサーバーに接続しました。', 'success');

        const service = await server.getPrimaryService(SERVICE_UUID);
        log('サービスを発見しました。', 'success');

        bleCharacteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
        log('キャラクタリスティックを発見しました。', 'success');

        // 通知を受け取るための設定
        await bleCharacteristic.startNotifications();
        bleCharacteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
        log('通知の受信を開始しました。データを受信すると更新されます。', 'success');

        statusMessage.textContent = `接続済み: ${device.name}`;
        statusMessage.style.color = 'green';

    } catch (error) {
        log(`接続エラー: ${error}`, 'error');
        statusMessage.textContent = '未接続';
        statusMessage.style.color = 'red';
    }
}

connectButton.addEventListener('click', connectToDevice);