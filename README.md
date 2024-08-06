
# Affiliate Dashboard

## Setting Up Firebase Hosting

### Step 1: Create Firebase Hosting Sites

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Navigate to the **Hosting** section of your project.
3. Create multiple hosting sites for different environments (e.g., **staging**, **production**).

### Step 2: Update `firebase.json`

Ensure that your `firebase.json` file is configured correctly for your environments:

```json
{
  "hosting": [
    {
      "target": "staging",
      "site": "your-staging-site-id",
      "public": "public",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ]
    },
    {
      "target": "production",
      "site": "your-production-site-id",
      "public": "public",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ]
    }
  ]
}
```

*Replace `"your-staging-site-id"` and `"your-production-site-id"` with your actual Firebase Hosting site IDs.*

### Step 3: Apply Targets to Sites

Link the hosting targets to their respective sites:

```bash
firebase target:apply hosting staging your-staging-site-id
firebase target:apply hosting production your-production-site-id
```

### Step 4: Using `deploy.sh` Script for Deployment

For convenience, you can use a `deploy.sh` script to handle setting the environment and deploying the project.

#### 1. Create the `deploy.sh` Script

Create a file named `deploy.sh` in the root directory of your project with the following content:

```bash
if [ -z "$1" ]; then
  echo "No environment provided. Usage: ./deploy.sh staging|production"
  exit 1
fi

echo "window.currentEnv = '$1';" > public/env.js

# Deploy using Firebase
firebase deploy --only hosting:$1
```

#### 2. Make the Script Executable

Run the following command to make the script executable:

```bash
chmod +x deploy.sh
```

#### 3. Deploy Using the Script

You can now deploy to a specific environment by running the script and passing the environment as an argument:


```bash
./deploy.sh ${env}
```

