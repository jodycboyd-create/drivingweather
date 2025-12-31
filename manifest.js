{
  "manifest_version": 3,
  "name": "[weong-route] + [weong-bulletin] L3",
  "version": "1.3.0",
  "description": "Integrated Velocity, Route, and ECCC Weather Engine for NL",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "content_scripts": [
    {
      "matches": ["*://*.your-map-provider.com/*"], 
      "js": [
        "route-engine.js",
        "velocity-widget.js",
        "weather-engine.js"
      ],
      "run_at": "document_end"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["data/nl/communities.json"],
      "matches": ["<all_urls>"]
    }
  ]
}
