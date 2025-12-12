
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const config = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
};

async function verifyR2() {
    console.log('Verifying R2 Connection with config:');
    console.log(`Account ID: ${config.accountId ? 'Present' : 'Missing'}`);
    console.log(`Access Key ID: ${config.accessKeyId ? 'Present' : 'Missing'}`);
    console.log(`Secret Access Key: ${config.secretAccessKey ? 'Present' : 'Missing'}`);

    if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
        console.error('❌ Missing R2 credentials in .env');
        process.exit(1);
    }

    const client = new S3Client({
        region: 'auto',
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
    });

    try {
        console.log('Attempting to list buckets...');
        const command = new ListBucketsCommand({});
        const result = await client.send(command);
        console.log('✅ Connection Successful!');
        console.log('Buckets:', result.Buckets.map(b => b.Name).join(', '));
    } catch (error) {
        console.error('❌ Connection Failed:', error);
    }
}

verifyR2();
