// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require("ask-sdk-core");
const { getFromSpoon } = require('./spoonacular/index')
const {
  clearFridge,
  addIngredientToFridge,
  getSelectedRecipe,
  getRecipeById,
  getFridgeById,
  putRecipeInDB,
  findOrCreateUser,
  removeIngredientFromFridge,
  getRecipe,
  connectAlexaToWeb,
} = require('./dbHelper');
const generalPrompt = 'Is there anything else I can do?';
const generalReprompt = 'Ask for help at any point';

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
    );
  },
  handle(handlerInput) {
    const session = handlerInput.requestEnvelope.session;
    let userId = session.user.userId.slice(18);
    findOrCreateUser(userId);
    const speakOutput = `Welcome to Julia Cooks. How can I help you today?`;
    const openingReprompt = `You can add ingredients you have by saying add blank to fridge. ask what is in my fridge to hear your stock. ask what can i make and I'll find you a recipe. remove a single ingredient from your fridge by saying remove blank from fridge. Clear fridge will empty all your ingredients. say help to hear this again.`
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(openingReprompt)
      .getResponse();
  },
};

const findRecipeByIngredientsHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "findRecipe"
    );
  },
  async handle(handlerInput) {
    const session = handlerInput.requestEnvelope.session;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let userId = session.user.userId.slice(18);
    let recipes = await getRecipe(userId);
    let speakOutput = "";
    let reprompt = "";
    if (recipes === undefined) {
      speakOutput = `We can't find a recipe based on what you have. Please either add more ingredients or remove the more random ingredients you have.`;
      reprompt = 'ask for help if you are confused, you can also clear your fridge and start again if you would like';
    } else {
      const recipeName = recipes[0].title;
      const ingredients = []
      recipes[0].ingredients.forEach((ingr) => {
       ingredients.push(`${ingr.amount} ${ingr.unit} ${ingr.name}`)
      })

      //const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

      const selectedRecipe = {
        id: recipes[0].id,
        ingredients: recipes[0].ingredients,
        image: recipes[0].image,
        readyInMinutes: recipes[0].readyInMinutes,
        servings: recipes[0].servings,
        steps: recipes[0].steps,
        title: recipes[0].title,
        vegan: recipes[0].vegan,
        vegetarian: recipes[0].vegetarian,
        likes: recipes[0].likes,
        stepIndex: 0,
      };
      const backupRecipe = {
        id: recipes[1].id,
        ingredients: recipes[1].ingredients,
        image: recipes[1].image,
        readyInMinutes: recipes[1].readyInMinutes,
        servings: recipes[1].servings,
        steps: recipes[1].steps,
        title: recipes[1].title,
        vegan: recipes[1].vegan,
        vegetarian: recipes[1].vegetarian,
        likes: recipes[1].likes,
        stepIndex: 0,
      };

      if (backupRecipe.id === undefined){
        reprompt = 'this is the only recipe we could find if you would like another one, please try again with some changes to the fridge'
      } else {
        reprompt =  `is this recipe okay? I also have ${recipes[1].title},  if you would prefer this one instead please say next recipe`
      }
        speakOutput = `we found a recipe for ${recipeName}. You will need the following ingredients, ${ingredients},     ask what is the first step to begin`;

      sessionAttributes.selectedRecipe = selectedRecipe;
      sessionAttributes.backupRecipe = backupRecipe;

      }
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(reprompt)
      .getResponse();
  },
};

const selectedRecipeHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "selectedRecipe"
    );
  },
  async handle (handlerInput) {
    try {
    let speakOutput = ``;
    const session = handlerInput.requestEnvelope.session;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let userId = session.user.userId.slice(18);
    console.log('userId', userId)
    let recipe = await getSelectedRecipe(userId)
      console.log('$$$$$$$$$',recipe)
      const selectedRecipe = {
        id: recipe.id,
        ingredients: recipe.ingredients,
        image: recipe.image,
        readyInMinutes: recipe.readyInMinutes,
        servings: recipe.servings,
        steps: recipe.steps,
        title: recipe.title,
        vegan: recipe.vegan,
        vegetarian: recipe.vegetarian,
        likes: recipe.likes,
        stepIndex: 0,
      };

    // if (selectedRecipe.id === undefined){
    //   speakOutput = 'Sorry we dont have a recipe saved for you at this time'
    //   return handlerInput.responseBuilder
    //   .speak(speakOutput)
    //   .reprompt(generalReprompt)
    //   .getResponse();
    // }

        let recipeTitle = selectedRecipe.title;
        let ingredients = []
        for (let i = 0; i < selectedRecipe.ingredients.length; i++) {
          let ingr = selectedRecipe.ingredients[i]
         await ingredients.push(` ${ingr.amount} ${ingr.unit} ${ingr.name} ,`)
        }
      speakOutput = `Okay, lets go with ${recipeTitle} instead, you will need ${ingredients},   ask for the first step to begin`;
      //speakOutput = `Okay, lets go with ${recipeTitle}, ask for the first step to begin`;

      sessionAttributes.selectedRecipe = selectedRecipe;
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(generalReprompt)
      .getResponse();
  } catch (err){
    console.error(err)
  }
  },
};




const nextRecipeHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "nextRecipe"
    );
  },
  async handle (handlerInput) {
    try {
    let speakOutput = ``;
    const session = handlerInput.requestEnvelope.session;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    if (session.attributes.backupRecipe === undefined){
      speakOutput = 'Sorry we dont have a backup recipe for you at this time'
      return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(generalReprompt)
      .getResponse();
    }
    let recipe = session.attributes.backupRecipe;
    let ingredients = []
      for (let i = 0; i < recipe.ingredients.length; i++) {
        let ingr = recipe.ingredients[i]
       await ingredients.push(` ${ingr.amount} ${ingr.unit} ${ingr.name} ,`)
      }
        let recipeTitle = recipe.title;
      speakOutput = `Okay, lets go with ${recipeTitle} instead, you will need ${ingredients},   ask for the first step to begin`;
      //speakOutput = `Okay, lets go with ${recipeTitle} instead, ask for the first step to begin`;

      sessionAttributes.selectedRecipe = session.attributes.backupRecipe;
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);


    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(generalReprompt)
      .getResponse();
  } catch (err){
    console.error(err)
  }
  },
};

const nextStepHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'nextStep'
    );
  },
  handle(handlerInput) {
    const session = handlerInput.requestEnvelope.session;
    let userId = session.user.userId.slice(18);
    session.attributes.selectedRecipe.stepIndex++;
    const selectedRecipe = session.attributes.selectedRecipe;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.selectedRecipe = selectedRecipe;
    if (session.attributes.selectedRecipe.stepIndex === 1) {
      putRecipeInDB(selectedRecipe, userId);
    }

    const statement = selectedRecipe.steps[selectedRecipe.stepIndex]
      ? ''
      : `,   Congratulations, you're all done!`;
    const speakOutput = `${
      selectedRecipe.steps[selectedRecipe.stepIndex - 1]
    }${statement}`;
    sessionAttributes.lastResponse = speakOutput;

    if (!selectedRecipe.steps[selectedRecipe.stepIndex]){
    sessionAttributes.selectedRecipe.ingredients.forEach((ingr) => {
      removeIngredientFromFridge(ingr.name, userId)
    })
  }
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(generalReprompt)
      .getResponse();
  },
};


const addToFridgeHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "addToFridge"
    );
  },
  async handle(handlerInput) {
    const session = handlerInput.requestEnvelope.session;
    let userId = session.user.userId.slice(18);
    const request = handlerInput.requestEnvelope.request;
    let speakOutput = '';
    let slotValues = getSlotValues(request.intent.slots);
    console.log('slotValues.food.heardAs', slotValues.food.heardAs)
    if (
      slotValues.food.heardAs === 'undefined' ||
      slotValues.food.heardAs === undefined
    ) {
      speakOutput = 'sorry I did not understand that';
    } else if (slotValues && slotValues.food) {
     let ingredient =  await getFromSpoon('ingredientByName', null, null,  slotValues.food.heardAs)
      let ingrObj = {
        name: ingredient.name,
        img: `https://spoonacular.com/cdn/ingredients_250x250/${ingredient.image}`,
        id: ingredient.id
      }
      speakOutput = `Added ${ingrObj.name} to the fridge`;
      addIngredientToFridge(userId, ingrObj, 'piece');
    } else {
      speakOutput = 'Sorry, i did not hear you.';
    }
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(generalPrompt)
      .getResponse();
  },
};

const removeFromFridgeHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'removeFromFridge'
    );
  },
  handle(handlerInput) {
    const session = handlerInput.requestEnvelope.session;
    let userId = session.user.userId.slice(18);
    const request = handlerInput.requestEnvelope.request;
    let speakOutput = '';
    let slotValues = getSlotValues(request.intent.slots);
    if (slotValues && slotValues.food) {
      speakOutput = `Removed ${slotValues.food.heardAs} from the fridge`;
      removeIngredientFromFridge(slotValues.food.heardAs, userId);
    } else {
      speakOutput = 'Sorry, i did not hear you.';
    }
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(generalPrompt)
      .getResponse();
  },
};

const clearFridgeHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'clearFridge'
    );
  },
  handle(handlerInput) {
    const session = handlerInput.requestEnvelope.session;
    let userId = session.user.userId.slice(18);
    let speakOutput = `Your fridge is empty`;

    clearFridge(userId);

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(generalPrompt)
      .getResponse();
  },
};

const getFridgeHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "getFridge"
    );
  },

  async handle(handlerInput) {
    console.log("handlerInput in getFridgeHandler ---->", handlerInput);
    const session = handlerInput.requestEnvelope.session;
    let userId = session.user.userId.slice(18);
    const fridge = await getFridgeById(userId);
    let speakOutput = "";
    let fridgeIng = Object.keys(fridge).join(", ");
    if (fridgeIng.length > 0) {
      speakOutput = `There is ${fridgeIng} in your fridge`;
    } else {
      speakOutput = 'Your fridge is empty';
    }
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(generalReprompt)
      .getResponse();
  },
};

/***************************************************************************/

const AlexaWebConnectionHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "connectAlexaToWeb"
    );
  },

  handle(handlerInput) {
    const session = handlerInput.requestEnvelope.session;
    let alexaId = session.user.userId.slice(18);
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.alexaId = alexaId;
    //john this next line may not be needed but from what i understand each time you change session you must set it
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    const speakOutput = "Please say your passcode one digit at a time.";
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .withSimpleCard("what did I learn", speakOutput)
      .getResponse();
  },
};

const AnswerIntentAlexaIdHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name ===
        "AnswerIntent_AlexaId"
    );
  },
  handle(handlerInput) {
    const slots = handlerInput.requestEnvelope.request.intent.slots
    let passcode = slots.idAnswer.value
    const session = handlerInput.requestEnvelope.session
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    sessionAttributes.passcode = passcode
    const speechText = `Your  passcode is: ${passcode}, please log out of the Julia Cooks website now. When logged out, please say confirm code.`
    //john this next line im not sure if it helps but from what i understand each time you change session you must set it
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard("What did I learn", speechText)
      .getResponse();
  },
};

const ConfirmCodeHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "ConfirmCode"
    );
  },
  handle(handlerInput) {
    const session = handlerInput.requestEnvelope.session;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let passcode = sessionAttributes.passcode;
    let alexaId = sessionAttributes.alexaId;
    connectAlexaToWeb(alexaId, passcode);

    const speechText =
      "Your online account has been successfully linked to your Alexa account. Thank you for using Julia Cooks.";

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse()
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "help"
    );
  },
  handle(handlerInput) {
    const speakOutput =
      'You can say add blank to fridge to add ingredients to your stock. You can also ask what can I make, to find recipes. clear fridge to empty it of all ingredients.';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(generalReprompt)
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.HelpIntent"
    );
  },
  handle(handlerInput) {
    const speakOutput = "You can say hello to me! How can I help?";
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

const RepeatHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.RepeatIntent"
    );
  },
  handle(handlerInput) {
    const session = handlerInput.requestEnvelope.session;
    const speakOutput = session.attributes.lastResponse;
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.CancelIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "AMAZON.StopIntent")
    );
  },
  handle(handlerInput) {
    const speakOutput = "Goodbye!";
    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) ===
      "SessionEndedRequest"
    );
  },
  handle(handlerInput) {
    // Any cleanup logic goes here.
    return handlerInput.responseBuilder.getResponse();
  },
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.

const IntentReflectorHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
    );
  },
  handle(handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    const speakOutput = `You just triggered ${intentName}`;
    return (
      handlerInput.responseBuilder
        .speak(speakOutput)
        //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
        .getResponse()
    );
  },
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`~~~~ Error handled: ${error.stack}`);
    const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt('I am having difficulties at this time')
      .getResponse();
  },
};

function getSlotValues(filledSlots) {
  const slotValues = {};
  Object.keys(filledSlots).forEach((item) => {
    const name = filledSlots[item].name;
    if (
      filledSlots[item] &&
      filledSlots[item].resolutions &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0] &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code
    ) {
      switch (
        filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code
      ) {
        case "ER_SUCCESS_MATCH":
          slotValues[name] = {
            heardAs: filledSlots[item].value,
            resolved:
              filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0]
                .value.name,
            ERstatus: "ER_SUCCESS_MATCH",
          };
          break;
        case "ER_SUCCESS_NO_MATCH":
          slotValues[name] = {
            heardAs: filledSlots[item].value,
            resolved: "",
            ERstatus: "ER_SUCCESS_NO_MATCH",
          };
          break;
        default:
          break;
      }
    } else {
      slotValues[name] = {
        heardAs: filledSlots[item].value,
        resolved: "",
        ERstatus: "",
      };
    }
  }, this);
  return slotValues;
}

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()

  .addRequestHandlers(
    HelpHandler,
    nextRecipeHandler,
    clearFridgeHandler,
    LaunchRequestHandler,
    selectedRecipeHandler,
    addToFridgeHandler,
    removeFromFridgeHandler,
    getFridgeHandler,
    nextStepHandler,
    AlexaWebConnectionHandler,
    AnswerIntentAlexaIdHandler,
    ConfirmCodeHandler,
    findRecipeByIngredientsHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    RepeatHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
