/* DEPENDENCIES */
const AWS = require('aws-sdk');
const dotenv = require('dotenv');
var fs = require('fs');
const { IoTClient, 
        CreateProvisioningTemplateCommand,
        CreateProvisioningClaimCommand,
        CreateKeysAndCertificateCommand, 
        RegisterThingCommand,
        CreateThingTypeCommand,
        CreateThingGroupCommand} = require("@aws-sdk/client-iot"); // CommonJS import

/* MIDDLEWARES */
dotenv.config({ path: './config.env' });

/* ENVIRONMENT */
const config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
};

/* Global Variables */
var CertificateId;
var thingGroup;
var thingType;
var templateString;
const thingName    = "TemperatureSensor";
const nameTemplate = 'provisioningTemplate';

/* APPLICATION */
const client = new IoTClient(config);

/* 
      Function Name : mainApp()
      Description   : This is main function where application starts
*/
async function mainApp(){
    /* 
      Function Name : createThingTypeF()
      Description   : This function is used to create "Thing Type"
      API Used      : CreateThingTypeCommand(input)
    */
    async function createThingTypeF(){
          var params = {
            thingTypeName : "iotSensorDevice",
            thingTypeProperties: {
              searchableAttributes: [
                'temperature',
                'model'
              ],
              thingTypeDescription: 'Temperature Sensor'
            }
          }
          const createTTypeCommand  = new CreateThingTypeCommand(params);
          const createTTypeResponse = await client.send(createTTypeCommand);
          thingType = createTTypeResponse.thingTypeName
          console.log("***********createThingTypeF***********")
          console.log(createTTypeResponse)
    };

    /* 
      Function Name : createThingGroupF()
      Description   : This function is used to create "Thing Group"
      API Used      : CreateThingGroupCommand(input)
    */
    async function createThingGroupF(){
            var params = {
              thingGroupName: 'TemperatureSensorsGroup', /* required */
              // parentGroupName: 'SensorsGroup',
              thingGroupProperties: {
                attributePayload: {
                  attributes: {
                    'temperature': 'Threshold_26',
                  }
                },
                thingGroupDescription: 'This Temperature Sensors Group'
              }
            }
            const createThingGroupCommand = new CreateThingGroupCommand(params);
            const createTGroupResponse    = await client.send(createThingGroupCommand);
            thingGroup = createTGroupResponse.thingGroupName
            console.log("***********createThingGroupF***********")
            console.log(createTGroupResponse)
    };

    /* 
      Function Name : createTemplateBodyF()
      Description   : This function is used to create "Template Body"
    */
    async function createTemplateBodyF(){
          let templateObject = fs.readFileSync('template.json');
          let templateJson   = JSON.parse(templateObject);
          templateJson.Resources.thing.Properties.ThingTypeName  = thingType
          templateJson.Resources.thing.Properties.ThingGroups[0] = thingGroup  
          templateString = JSON.stringify(templateJson);
          console.log("***********createTemplateBodyF***********")
          console.log(templateJson)
          console.log("==========================================")
          console.log(templateString)
    };

    /* 
      Function Name : createTemplateF()
      Description   : This function is used to create "Provisioning Template"
      API Used      : CreateProvisioningTemplateCommand(input)
    */
    async function createTemplateF(){
            var params = {
                provisioningRoleArn: 'arn:aws:iam::518673035066:role/ProvisioningRoles',
                templateBody : templateString,
                templateName: nameTemplate, /* required */
                description: 'This is the template for device provisioning',
                enabled: true,
                tags: [
                  {
                    Key: 'Provisioning', /* required */
                    Value: 'Device-1'
                  }
                ]
            };
            const createTemplateCommand  = new CreateProvisioningTemplateCommand(params);
            const createTemplateResponse = await client.send(createTemplateCommand);
            console.log("***********createTemplateF***********")
            console.log(createTemplateResponse)
    };

    /* 
      Function Name : claimTemplateF()
      Description   : This function is used to claim the provisioning template
      API Used      : CreateProvisioningClaimCommand(input)
    */
    async function claimTemplateF(){
            var params = {
              templateName: nameTemplate /* required */
            };
            const claimTemplateCommand = new CreateProvisioningClaimCommand(params);
            const claimTemplateResponse = await client.send(claimTemplateCommand);
            console.log("***********claimTemplateF***********")
            console.log(claimTemplateResponse)
    };

    /* 
      Function Name : createKeysandCertificateF()
      Description   : This function is used to create (temporary) "Keys & Certificates"
      API Used      : CreateKeysAndCertificateCommand(input)
    */
    async function createKeysandCertificateF(){
            var params = {
              setAsActive: true
            };
            const createKeysandCertificateCommand  = new CreateKeysAndCertificateCommand(params);
            const createKeysandCertificateResponse = await client.send(createKeysandCertificateCommand);
            CertificateId = createKeysandCertificateResponse.certificateId
            console.log("***********createKeysandCertificateF***********")
            console.log(createKeysandCertificateResponse);
            downloadKeysAndCertificatesF(thingName+".public.Key",createKeysandCertificateResponse.keyPair.PublicKey)
            downloadKeysAndCertificatesF(thingName+".private.Key",createKeysandCertificateResponse.keyPair.PrivateKey)

    };

    /* 
      Function Name : registerThingF()
      Description   : This function is used to resgister the thing in registery
      API Used      : RegisterThingCommand(input)
    */
    async function registerThingF(){
            var params = {
                templateBody : templateString,
                parameters: {
                  "AWS::IoT::Certificate::CommonName": thingName,
                  "AWS::IoT::Certificate::SerialNumber": "123",
                  "AWS::IoT::Certificate::Country": "us-east-1",
                  "AWS::IoT::Certificate::Id": CertificateId
                }
            };
            const registerThingCommand  = new RegisterThingCommand(params);
            const registerThingResponse = await client.send(registerThingCommand);
            console.log("***********registerThingF***********")
            console.log(registerThingResponse);
            downloadKeysAndCertificatesF(thingName+".certificate.pem",registerThingResponse.certificatePem)
    };

    /* 
      Function Name : downloadKeysAndCertificatesF()
      Description   : This function is used to download the permanent keys and certificate into local system
    */
    async function downloadKeysAndCertificatesF(fileName,data){
        var stream = fs.createWriteStream(fileName);
        stream.once('open', function(fd) {
        stream.write(data);
        stream.end();
        });
    };

    /*Function Calls*/
    await createThingTypeF();
    await createThingGroupF();
    await createTemplateBodyF();
    await createTemplateF();
    await claimTemplateF();
    await createKeysandCertificateF();
    await registerThingF();
};


mainApp();