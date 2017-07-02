// You must include a context, but other arguments are optional
module.exports = (context, data) => {
  context.log('This function called');
  context.log(data);
  context.res = {
    "text": "Would you like to play a game?",
    "response_type": "in_channel",
    "attachments": [
        {
            "text": "Choose a game to play",
            "fallback": "If you could read this message, you'd be choosing something fun to do right now.",
            "color": "#3AA3E3",
            "attachment_type": "default",
            "callback_id": "game_selection",
            "actions": [
                {
                  "name": "games_list",
                  "text": "Pick a game...",
                  "type": "select",
                  "option_groups": [
                    {
                        "text": "Doggone bot antics",
                        "options": [
                                {
                                    "text": "Unexpected sentience",
                                    "value": "AI-2323"
                                },
                                {
                                    "text": "Bot biased toward other bots",
                                    "value": "SUPPORT-42"
                                },
                                {
                                    "text": "Bot broke my toaster",
                                    "value": "IOT-75"
                                }
                        ]
                    },
                    {
                        "text": "Human error",
                        "options": [
                            {
                                "text": "Not Penny's boat",
                                "value": "LOST-7172"
                            },
                            {
                                "text": "We built our own CMS",
                                "value": "OOPS-1"
                            }
                        ]
                    }
                  ]
                }
            ]
        }
    ]
  }
  context.done();
};