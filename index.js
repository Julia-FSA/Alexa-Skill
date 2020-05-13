// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
const {
    addIngredientToFridge,
    getRecipeById,
    getFridgeById,
    findOrCreateUser,
    removeIngredientFromFridge,
    getRecipe
} = require('./dbHelper')
const generalPrompt = 'Is there anything else I can do?'
const { developerName } = require('./secrets')
// let fridge = [];
let ingredient = [];

let state = {}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        console.log('<----------------', handlerInput);
        console.log('user ---->', handlerInput.requestEnvelope.session.user.userId);
        console.log('sessionid ----> ', handlerInput.requestEnvelope.session.sessionId)

        let userId = handlerInput.requestEnvelope.session.user.userId
        state.userId = userId.slice(18)
        findOrCreateUser(state.userId)

        const speakOutput = `Welcome to Julia Cooks. I am running from ${developerName}'s Lambda function. How can I help you today?`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};


const findRecipeByIngredientsHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'findRecipe'
  },
  handle(handlerInput) {
    const speakOutput = `We found a recipe.`
    getRecipe('saltthis123')
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(
        'add a reprompt if you want to keep the session open for the user to respond'
      )
      .getResponse()
  }
}

const getRecipeHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'getRecipe';
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request
        let speakOutput = '';
        let slotValues = getSlotValues(request.intent.slots);
        if(slotValues && slotValues.food){
            speakOutput = `Added ${slotValues.food.heardAs} to the fridge`;
            fridge.push(slotValues.food.heardAs);
            addIngredientToFridge(slotValues.food.heardAs, 'each');
        } else {
            speakOutput = 'Sorry, i did not hear you.';
        }
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(generalPrompt)
            .getResponse();
    }
}

const addToFridgeHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'addToFridge';
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        let speakOutput = '';
        let slotValues = getSlotValues(request.intent.slots);
        if(slotValues && slotValues.food){
            speakOutput = `Added ${slotValues.food.heardAs} to the fridge`;
            addIngredientToFridge(state.userId, slotValues.food.heardAs, 'each');
        } else {
            speakOutput = 'Sorry, i did not hear you.';
        }
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(generalPrompt)
            .getResponse();
    }
};

const removeFromFridgeHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'removeFromFridge';
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        let speakOutput = '';
        let slotValues = getSlotValues(request.intent.slots);
        if(slotValues && slotValues.food){
            speakOutput = `Removed ${slotValues.food.heardAs} from the fridge`;
            removeIngredientFromFridge(slotValues.food.heardAs);
        } else {
            speakOutput = 'Sorry, i did not hear you.';
        }
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(generalPrompt)
            .getResponse();
    }
};


const getFridgeHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'getFridge';
    },
    async handle(handlerInput) {
        const fridge = await getFridgeById(state.userId)
        console.log('fridge', Object.keys(fridge))
        const speakOutput = `There is ${Object.keys(fridge).join(", ")} in your fridge`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const getIngredientHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'getIngredient';
    },
    handle(handlerInput) {
        const speakOutput = `Your ingredient is ${ingredient[0]}.`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) ===
      'SessionEndedRequest'
    )
  },
  handle(handlerInput) {
    // Any cleanup logic goes here.
    return handlerInput.responseBuilder.getResponse()
  },
}
// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.

const IntentReflectorHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
    )
  },
  handle(handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope)
    const speakOutput = `You just triggered ${intentName}`
    return (
      handlerInput.responseBuilder
        .speak(speakOutput)
        //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
        .getResponse()
    )
  },
}
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
            .reprompt(speakOutput)
            .getResponse();
    }
};

function getSlotValues(filledSlots) {
  const slotValues = {}
  Object.keys(filledSlots).forEach((item) => {
    const name = filledSlots[item].name
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
        case 'ER_SUCCESS_MATCH':
          slotValues[name] = {
            heardAs: filledSlots[item].value,
            resolved:
              filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0]
                .value.name,
            ERstatus: 'ER_SUCCESS_MATCH',
          }
          break
        case 'ER_SUCCESS_NO_MATCH':
          slotValues[name] = {
            heardAs: filledSlots[item].value,
            resolved: '',
            ERstatus: 'ER_SUCCESS_NO_MATCH',
          }
          break
        default:
          break
      }
    } else {
      slotValues[name] = {
        heardAs: filledSlots[item].value,
        resolved: '',
        ERstatus: '',
      }
    }
  }, this)
  return slotValues
}
// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()

    .addRequestHandlers(
        LaunchRequestHandler,
        getRecipeHandler,
        addToFridgeHandler,
        removeFromFridgeHandler,
        getFridgeHandler,
        getIngredientHandler,
        findRecipeByIngredientsHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    .lambda();
