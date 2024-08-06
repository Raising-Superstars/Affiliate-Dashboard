

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

### Step 4: Deploying to Different Environments

Deploy to a specific environment using the following command:

```bash
firebase deploy --only hosting:${env}
```

*Replace `${env}` with either `staging` or `production` depending on where you want to deploy.*

