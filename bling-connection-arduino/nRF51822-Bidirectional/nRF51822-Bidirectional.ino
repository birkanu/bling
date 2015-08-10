/*
 *   Copyright (c) 2014 RedBearLab, All rights reserved.
 *
 *   This library is free software; you can redistribute it and/or
 *   modify it under the terms of the GNU Lesser General Public
 *   License as published by the Free Software Foundation; either
 *   version 2.1 of the License, or (at your option) any later version.
 *
 *   This library is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *   See the GNU Lesser General Public License for more details.
 *
 *   You should have received a copy of the GNU Lesser General Public
 *   License along with this library; if not, write to the Free Software
 *   Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 *   EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 *   MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 *   IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 *   CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 *   TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 *   SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
 
#include <Wire.h>
#include <BLE_API.h>

#define    MPU9250_ADDRESS            0x68
#define    MAG_ADDRESS                0x0C
 
#define    GYRO_FULL_SCALE_250_DPS    0x00  
#define    GYRO_FULL_SCALE_500_DPS    0x08
#define    GYRO_FULL_SCALE_1000_DPS   0x10
#define    GYRO_FULL_SCALE_2000_DPS   0x18
 
#define    ACC_FULL_SCALE_2_G        0x00  
#define    ACC_FULL_SCALE_4_G        0x08
#define    ACC_FULL_SCALE_8_G        0x10
#define    ACC_FULL_SCALE_16_G       0x18

#define TXRX_BUF_LEN                      20
#define UART_RX_TIME                      APP_TIMER_TICKS(10, 0)

BLEDevice  ble;

static app_timer_id_t                     m_uart_action_id; 
static uint8_t action_buf[TXRX_BUF_LEN];
static uint8_t action_buf_num;
static uint8_t action_state=0;

// RBL TXRX Service
static const uint8_t bling_service_uuid[]     = {0x71, 0x3D, 0, 0, 0x50, 0x3E, 0x4C, 0x75, 0xBA, 0x94, 0x31, 0x48, 0xF1, 0x8D, 0x94, 0x1E};
static const uint8_t bling_imu_uuid[]       = {0x71, 0x3D, 0, 2, 0x50, 0x3E, 0x4C, 0x75, 0xBA, 0x94, 0x31, 0x48, 0xF1, 0x8D, 0x94, 0x1E};
static const uint8_t bling_service_uuid_rev[] = {0x1E, 0x94, 0x8D, 0xF1, 0x48, 0x31, 0x94, 0xBA, 0x75, 0x4C, 0x3E, 0x50, 0, 0, 0x3D, 0x71};

static const uint8_t command_service_uuid[]       = {0x71, 0x3D, 0, 4, 0x50, 0x3E, 0x4C, 0x75, 0xBA, 0x94, 0x31, 0x48, 0xF1, 0x8D, 0x94, 0x1E};
static const uint8_t command_receive_uuid[]       = {0x71, 0x3D, 0, 3, 0x50, 0x3E, 0x4C, 0x75, 0xBA, 0x94, 0x31, 0x48, 0xF1, 0x8D, 0x94, 0x1E};
static const uint8_t command_feedback_uuid[]       = {0x71, 0x3D, 0, 6, 0x50, 0x3E, 0x4C, 0x75, 0xBA, 0x94, 0x31, 0x48, 0xF1, 0x8D, 0x94, 0x1E};

uint8_t actionPayload[TXRX_BUF_LEN] = {0,};
uint8_t commandPayload[TXRX_BUF_LEN] = {};

GattCharacteristic  commandReceiveCharacteristic(command_receive_uuid, commandPayload, 1, TXRX_BUF_LEN,
                                      GattCharacteristic::BLE_GATT_CHAR_PROPERTIES_WRITE | GattCharacteristic::BLE_GATT_CHAR_PROPERTIES_WRITE_WITHOUT_RESPONSE);
                                      
/*GattCharacteristic  commandFeedbackCharacteristic(command_feedback_uuid, commandPayload, 1, TXRX_BUF_LEN,
                                      GattCharacteristic::BLE_GATT_CHAR_PROPERTIES_NOTIFY);
                                      
GattCharacteristic *commandChars[] = {&commandReceiveCharacteristic, &commandFeedbackCharacteristic}; 

GattService         commandService(command_service_uuid, commandChars, sizeof(commandChars) / sizeof(GattCharacteristic *));  */                                    

GattCharacteristic  actionCharacteristic(bling_imu_uuid, actionPayload, 1, TXRX_BUF_LEN,
                                      GattCharacteristic::BLE_GATT_CHAR_PROPERTIES_NOTIFY);
                                      
GattCharacteristic *actionChars[] = {&actionCharacteristic,&commandReceiveCharacteristic}; 

GattService         blingService(bling_service_uuid, actionChars, sizeof(actionChars) / sizeof(GattCharacteristic *));

// This function read Nbytes bytes from I2C device at address Address. 
// Put read bytes starting at register Register in the Data array. 
void I2Cread(uint8_t Address, uint8_t Register, uint8_t Nbytes, uint8_t* Data)
{
  // Set register address
  Wire.beginTransmission(Address);
  Wire.write(Register);
  Wire.endTransmission();
 
  // Read Nbytes
  Wire.requestFrom(Address, Nbytes); 
  uint8_t index=0;
  while (Wire.available())
    Data[index++]=Wire.read();
}

uint8_t readByte(uint8_t address, uint8_t subAddress)
{
	uint8_t data; // `data` will store the register data	 
	Wire.beginTransmission(address);         // Initialize the Tx buffer
	Wire.write(subAddress);	                 // Put slave register address in Tx buffer
	Wire.endTransmission(false);             // Send the Tx buffer, but send a restart to keep connection alive
	Wire.requestFrom(address, (uint8_t) 1);  // Read one byte from slave register address 
	data = Wire.read();                      // Fill Rx buffer with result
	return data;                             // Return data read from slave register
}

// Write a byte (Data) in device (Address) at register (Register)
void I2CwriteByte(uint8_t Address, uint8_t Register, uint8_t Data)
{
  // Set register address
  Wire.beginTransmission(Address);
  Wire.write(Register);
  Wire.write(Data);
  Wire.endTransmission();
}

void m_bling_action_handle(void * p_context)
{   
    uint8_t Buf[14];
    I2Cread(MPU9250_ADDRESS,0x3B,14,Buf);
    for(action_buf_num=0;action_buf_num<6;action_buf_num++){
      action_buf[action_buf_num] = Buf[action_buf_num];
    }
    for(action_buf_num=6;action_buf_num<12;action_buf_num++){
      action_buf[action_buf_num] = Buf[action_buf_num+2];
    }
    action_buf[19] = digitalRead(A3);
    ble.updateCharacteristicValue(actionCharacteristic.getHandle(), action_buf, 20);//action_buf_num);   
    action_state = 0;
}

void actionCallBack(void)
{    
    uint32_t err_code = NRF_SUCCESS;
    
    if (action_state == 0)
    {  
        action_state = 1;
        action_buf_num=0;
    }
    while ( Serial.available() )
    {
        int readByte = Serial.read();
        action_buf[action_buf_num] = readByte;
        action_buf_num++;
    }
}

void disconnectionCallback(void)
{
    ble.startAdvertising();
}

void onDataWritten(uint16_t charHandle)
{	
    uint8_t buf[TXRX_BUF_LEN];
    uint16_t bytesRead;
	
    if ( charHandle == commandReceiveCharacteristic.getHandle() ) 
    {
        ble.readCharacteristicValue(commandReceiveCharacteristic.getHandle(), buf, &bytesRead);
        if( buf[0] == 1 )
        {
            digitalWrite(0,HIGH);
            delay(1000);
            digitalWrite(0,LOW);
        }
        else  //This is just for debugging, to see we actually get inside onDataWritten
        {
            digitalWrite(13,HIGH);
            delay(1000);
            digitalWrite(13,LOW);
        }
    }
}

void setup(void)
{
    uint32_t err_code = NRF_SUCCESS;
    
    delay(500);
    Wire.begin();
    Serial.begin(9600);
    pinMode(A3, INPUT);
    pinMode(13, OUTPUT);
    pinMode(0, OUTPUT);
    
    I2CwriteByte(MPU9250_ADDRESS,27,GYRO_FULL_SCALE_500_DPS);
    I2CwriteByte(MPU9250_ADDRESS,28,ACC_FULL_SCALE_4_G);
        
    ble.init();
    ble.onDisconnection(disconnectionCallback);
    ble.onDataWritten(onDataWritten);

    /* setup advertising */
    ble.accumulateAdvertisingPayload(GapAdvertisingData::BREDR_NOT_SUPPORTED | GapAdvertisingData::LE_GENERAL_DISCOVERABLE);
    ble.setAdvertisingType(GapAdvertisingParams::ADV_CONNECTABLE_UNDIRECTED);
    //ble.accumulateAdvertisingPayload(GapAdvertisingData::SHORTENED_LOCAL_NAME,(const uint8_t *)"IMU", sizeof("IMU") - 1);
    ble.accumulateAdvertisingPayload(GapAdvertisingData::COMPLETE_LOCAL_NAME,(const uint8_t *)"COMMANDS", sizeof("COMMANDS") - 1);
    ble.accumulateAdvertisingPayload(GapAdvertisingData::COMPLETE_LIST_128BIT_SERVICE_IDS,(const uint8_t *)bling_service_uuid_rev, sizeof(bling_service_uuid));

    /* 100ms; in multiples of 0.625ms. */
    ble.setAdvertisingInterval(160); 

    ble.addService(blingService);
    //ble.addService(commandService);
    
    //Set Dev_Name
    err_code = RBL_SetDevName("nRF51822_Serial");
    APP_ERROR_CHECK(err_code);
    
    ble.startAdvertising();
    
    err_code = app_timer_create(&m_uart_action_id,APP_TIMER_MODE_REPEATED, m_bling_action_handle);
    APP_ERROR_CHECK(err_code);
    
    err_code = app_timer_start(m_uart_action_id,UART_RX_TIME, NULL);
    APP_ERROR_CHECK(err_code);
}

void loop(void)
{
    ble.waitForEvent();
}
