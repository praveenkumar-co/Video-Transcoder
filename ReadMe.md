For a video transcoder service, these tools handle the heavy lifting: Node.js manages the logic and "worker" threads, while Docker runs your databases and the FFmpeg engine in a clean, isolated way.

checking for node --version : 
node -v 
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash.  

the commmand is used to use multiple node version together in one system : 

-----------------------------------------
Phase 1 : 
project/
├── apps/
│   ├── api/                  ← Node/Express + TypeScript
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   └── upload.routes.ts     ← presigned URL generation
│   │   │   ├── controllers/
│   │   │   │   └── upload.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── s3.service.ts        ← AWS SDK v3 wrapper
│   │   │   │   └── video.service.ts     ← MongoDB operations
│   │   │   ├── webhooks/
│   │   │   │   └── s3.webhook.ts        ← receives S3 event → saves metadata
│   │   │   ├── models/
│   │   │   │   └── video.model.ts       ← Mongoose schema + types
│   │   │   ├── types/
│   │   │   │   └── index.ts             ← shared VideoJob, VideoMetadata, etc.
│   │   │   ├── config/
│   │   │   │   └── env.ts               ← zod-validated env vars
│   │   │   └── app.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── client/               ← React + TypeScript (Vite)
│       └── src/
│           ├── components/
│           │   └── UploadWidget.tsx     ← drag-drop, progress, multipart
│           ├── hooks/
│           │   └── useUpload.ts         ← presigned URL fetch + S3 PUT logic
│           └── types/
│               └── index.ts
├── docker-compose.yml        ← mongo + redis (for Phase 2 readiness)
└── .env.example

To create folder inside folder / command is used 

1 .To use AWS S3 service  : npm install @aws-sdk/client-s3 in node terminal 
2 . @aws-sdk/s3-request-presigner is the specific package used in the AWS SDK for JavaScript (v3) to generate presigned URLs for operations like uploading or downloading files
---------------------------------------
Use of type/index.ts in src backend  :
apps/api/src/types/index.ts defines shared TypeScript types used across your backend.
Instead of rewriting shapes again and again, you define them once and reuse everywhere.

for example : 
Worker Result / Progress

export interface TranscodeProgress {
  videoId: string;
  progress: number; // 0–100
}

export interface TranscodeResult {
  videoId: string;
  outputUrls: string[];
  duration: number;
}

----------------------------

Note : Env is a configuration File 
While : env.ts This is a TypeScript wrapper around .env

In production .env.example for sample of env file along with .env file would be there
---------------------------------

Example : 
// 1. The Master Template
interface Person {
  name: string;
  email: string;
  ssn: number; // Sensitive info!
}

// 2. The Remix (Using Omit and Extends)
interface JobApplication extends Omit<Person, 'ssn'> {
  appliedRole: string;
}


mit<Person, 'ssn'>: This tells TypeScript: "Take everything from Person, but drop the ssn field." It creates a temporary version of the person that is safe to use.

--------------------------

S3 KEY :  to get uploaded Video/file from AWS S3 

Finally uploaded File :

await Video.create({
  s3Key,
  bucket: env.S3_RAW_BUCKET,
  originalName: params.fileName,
  mimeType: params.mimeType,
  sizeBytes: params.sizeBytes,
  status: VideoStatus.PENDING,
});

-------------------
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
S3 client is used for connection between Client and AWSS3 

PutObjectCommand is used to The PutObject command adds a single object (up to 5 GB) to an S3 bucket, 

HeadObjectCommand is used to to efficiently verify if an object exists
-------------------------
Note : 
Correct way : export async function functionName ():Promise<fnjwenfj>{

}
Or : 

export const funcionan = async (): Promise<void> => { ... };

---------------------------
S3 is an Class
s3 is an Object
---------------------------
In order to check a file in S3 : 
“check file” → HeadObject

PutObject → PutObjectCommand
HeadObject → HeadObjectCommand

Use: 
It verifies if an object exists by retrieving its metadata (like file size or content type) without downloading the actual file content
-------------------------------------
Industry Level Approach to build any application

schemas -> services -> Validators -> controllers -> routes -> app,s -> server.js -> connection with frontend 

-----------------------------------
body: Record<string, unknown> according to :
a record is a typescript utility that is based on key : pair , where key here will always be string while , unknown refer to any thing string , number , boolean etc .... 
-----------------------------------
req.headers['x-amz-sns-message-type']
This looks into the HTTP headers sent by the requester (in this case, Amazon SNS). It is searching for a header named x-amz-sns-message-type, which tells you what kind of notification you just received (e.g., a SubscriptionConfirmation or a Notification).

--------------------------------------
What handleS3Event does

For each uploaded file:

Gets S3 data (bucket + key)
Extracts videoId
Verifies file exists in S3
Updates DB status → QUEUED
-----------------------------
👉 AWS (SNS) sends this URL to your backend:
const subscribeUrl = body['SubscribeURL'];

Meaning:

AWS → “Here is a confirmation link. Call it to activate webhook.”
------------------------------

Flow : 
Client → uploads via presigned URL → S3 stores file
       ↓
S3 Event → SNS → calls your webhook
       ↓
Your backend processes the event

------------------------------

Playback without transcoding (baseline)

“After the upload, the backend stores the S3 object key in the database.
When the user wants to watch the video, the backend generates a presigned GET URL from Amazon S3 or serves it via Amazon CloudFront.
The client uses that URL to stream or download the video.”
---------------------------------

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/index.js';

export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void {
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
  });
}

export function notFoundHandler(_req: Request, res: Response<ApiResponse>): void {
  res.status(404).json({ success: false, error: 'Route not found' });
}
----------------------------------
Connection of env and env.ts 

Yes. dotenv.config() loads variables from .env into process.env. Then your env.ts (using Zod) reads process.env, validates required fields, and converts types. After that, you export a safe env object and use it across your app. .env stores values; env.ts makes them reliable and usable.

---------------------------------
