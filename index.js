// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core')
const {
  addIngredientToFridge,
  getRecipeById,
  getFridgeById,
  findOrCreateUser,
  removeIngredientFromFridge,
  getRecipe,
  connectAlexaToWeb,
} = require('./dbHelper')
const generalPrompt = 'Is there anything else I can do?'
const {developerName} = require('./secrets')
// let fridge = [];
let ingredient = []

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest'
    )
  },
  handle(handlerInput) {
    // console.log('handlerInput in LaunchRequestHandler ---->', handlerInput)
    // console.log('user ---->', handlerInput.requestEnvelope.session.user.userId)
    // console.log(
    //   'sessionid ----> ',
    //   handlerInput.requestEnvelope.session.sessionId
    // )
    const session = handlerInput.requestEnvelope.session
    let userId = session.user.userId.slice(18)
    findOrCreateUser(userId)
    const speakOutput = `Welcome to Julia Cooks. How can I help you today?`
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse()
  },
}

const findRecipeByIngredientsHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'findRecipe'
    )
  },
  async handle(handlerInput) {
    // console.log(
    //   'handlerInput in findRecipeByIngredientsHandler ---->',
    //   handlerInput
    // )
    const session = handlerInput.requestEnvelope.session
    let userId = session.user.userId.slice(18)
    let spoonacular = await getRecipe(userId)
    let speakOutput = ''
    if (!spoonacular) {
      speakOutput = `We can't find a recipe based on what you have. Please buy more stuff.`
    } else {
      const recipe = spoonacular.steps
      const recipeName = spoonacular.title
      console.log(spoonacular.ingredients)
      const ingredients = spoonacular.ingredients
        .filter((item, index) => index % 2 === 1)
        .join(', ')
      console.log(ingredients)
      const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
      const selectedRecipe = {
        name: recipeName,
        steps: recipe,
        stepIndex: 0,
      }
      sessionAttributes.selectedRecipe = selectedRecipe
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes)
      speakOutput = `we found a recipe for ${recipeName}. You will need the following ingredients, ${ingredients}`
    }

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(
        'add a reprompt if you want to keep the session open for the user to respond'
      )
      .getResponse()
  },
}
const nextStepHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'nextStep'
    )
  },
  handle(handlerInput) {
    // console.log(
    //   'handlerInput in findRecipeByIngredientsHandler ---->',
    //   handlerInput
    // )
    const session = handlerInput.requestEnvelope.session
    session.attributes.selectedRecipe.stepIndex++

    const selectedRecipe = session.attributes.selectedRecipe
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    sessionAttributes.selectedRecipe = selectedRecipe

    const statement = selectedRecipe.steps[selectedRecipe.stepIndex]
      ? ''
      : ` Congratulations, you're all done!`
    const speakOutput = `${
      selectedRecipe.steps[selectedRecipe.stepIndex - 1]
    }${statement}`
    sessionAttributes.lastResponse = speakOutput

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes)

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(
        'add a reprompt if you want to keep the session open for the user to respond'
      )
      .getResponse()
  },
}

// const getRecipeHandler = {
//   canHandle(handlerInput) {
//     return (
//       Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
//       Alexa.getIntentName(handlerInput.requestEnvelope) === 'getRecipe'
//     )
//   },
//   handle(handlerInput) {
//     const request = handlerInput.requestEnvelope.request
//     let speakOutput = ''
//     let slotValues = getSlotValues(request.intent.slots)
//     if (slotValues && slotValues.food) {
//       speakOutput = `Added ${slotValues.food.heardAs} to the fridge`
//       fridge.push(slotValues.food.heardAs)
//       addIngredientToFridge(slotValues.food.heardAs, 'each')
//     } else {
//       speakOutput = 'Sorry, i did not hear you.'
//     }
//     return handlerInput.responseBuilder
//       .speak(speakOutput)
//       .reprompt(generalPrompt)
//       .getResponse()
//   },
// }

const addToFridgeHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'addToFridge'
    )
  },
  handle(handlerInput) {
    console.log('handlerInput in addToFridgeHandler ---->', handlerInput)
    const session = handlerInput.requestEnvelope.session
    let userId = session.user.userId.slice(18)
    const request = handlerInput.requestEnvelope.request
    let speakOutput = ''
    let slotValues = getSlotValues(request.intent.slots)
    if (slotValues && slotValues.food) {
      speakOutput = `Added ${slotValues.food.heardAs} to the fridge`
      addIngredientToFridge(userId, slotValues.food.heardAs, 'each')
    } else {
      speakOutput = 'Sorry, i did not hear you.'
    }
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(generalPrompt)
      .getResponse()
  },
}

const removeFromFridgeHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'removeFromFridge'
    )
  },
  handle(handlerInput) {
    const session = handlerInput.requestEnvelope.session
    let userId = session.user.userId.slice(18)
    const request = handlerInput.requestEnvelope.request
    let speakOutput = ''
    let slotValues = getSlotValues(request.intent.slots)
    if (slotValues && slotValues.food) {
      speakOutput = `Removed ${slotValues.food.heardAs} from the fridge`
      removeIngredientFromFridge(slotValues.food.heardAs, userId)
    } else {
      speakOutput = 'Sorry, i did not hear you.'
    }
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(generalPrompt)
      .getResponse()
  },
}

// const getFridgeHandler = {
//   canHandle(handlerInput) {
//     return (
//       Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
//       Alexa.getIntentName(handlerInput.requestEnvelope) === 'getFridge'
//     )
//   },
//   async handle(handlerInput) {
//     console.log('handlerInput in getFridgeHandler ---->', handlerInput)
//     const session = handlerInput.requestEnvelope.session
//     let userId = session.user.userId.slice(18)
//     const fridge = await getFridgeById(userId)
//     console.log('fridge', Object.keys(fridge))
//     const speakOutput = `There is ${Object.keys(fridge).join(
//       ', '
//     )} in your fridge`
//     return handlerInput.responseBuilder
//       .speak(speakOutput)
//       .reprompt(
//         'add a reprompt if you want to keep the session open for the user to respond'
//       )
//       .getResponse()
//   },
// }

/***************************************************************************/
/***************************************************************************/
/***************************************************************************/
/***************************************************************************/
/***************************************************************************/

let passcode
let alexaId
const AlexaWebConnectionHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'connectAlexaToWeb'
    )
  },

  // HOW TO GET UUID FROM USER
  handle(handlerInput) {
    const session = handlerInput.requestEnvelope.session
    alexaId = session.user.userId.slice(18)
    // console.log('alexaId >>>>>>>>>>>>>>>>>>', alexaId)

    const speakOutput = 'Please say your passcode one digit at a time.'
    // For example, for john@email.com, say j o h n at e m a i l dot c o m. Please say your email now.'
    // connectAlexaToWeb(alexaId, email, uuid)
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .withSimpleCard('what did I learn', speakOutput)
      .getResponse()
  },
  // console.log('ANSWER >>>>>>>>>>>>>>>>', answer)
}

// const AnswerIntentHandler = {
//   canHandle(handlerInput) {
//     return (
//       Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
//       Alexa.getIntentName(handlerInput.requestEnvelope) === 'AnswerIntent'
//     )
//     // return (
//     //   handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
//     //   handlerInput.requestEnvelope.request.intent.name === 'AnswerIntent'
//     // )
//   },
//   handle(handlerInput) {
//     console.log('ANSWER INTENT TRIGGERED !!!!!!!!!!!!!!!!!!!')
//     const slots = handlerInput.requestEnvelope.request.intent.slots
//     console.log(
//       'handlerInput.requestEnvelope.request.intent*********************',
//       handlerInput.requestEnvelope.request.intent
//     )
//     passcode = slots.emailAnswer.value
//     const speechText = `Your passcode is ${passcode}`
//     // `If your email is not: ${userEmail.forEach(
//     //   (character) => character
//     // )}, please say your email again. If the email is correct, please say your 8 digit Alexa Code now.`

//     return handlerInput.responseBuilder
//       .speak(speechText)
//       .reprompt(speechText)
//       .withSimpleCard('What did I learn', speechText)
//       .getResponse()
//   },
// }

const AnswerIntentAlexaIdHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name ===
        'AnswerIntent_AlexaId'
    )
  },
  handle(handlerInput) {
    console.log('ALEXA ID INTENT TRIGGERED !!!!!!!!!!!!!!!!!!!')
    const slots = handlerInput.requestEnvelope.request.intent.slots
    console.log(
      'handlerInput.requestEnvelope.request.intent*********************',
      handlerInput.requestEnvelope.request.intent
    )
    passcode = slots.idAnswer.value
    const speechText = `Your  passcode is: ${passcode}, please say confirm code now.`
    // , please say your code again and start by saying my alexa code is. If correct, please say confirm code.`

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('What did I learn', speechText)
      .getResponse()
  },
}

const ConfirmCodeHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'ConfirmCode'
    )
  },
  handle(handlerInput) {
    console.log('ConfirmCode INTENT TRIGGERED !!!!!!!!!!!!!!!!!!!')
    connectAlexaToWeb(alexaId, passcode)
    const speechText =
      'Your online account has been successfully linked to your Alexa account. Thank you for using Julia.'
    // refer to line 69-76 if it works.

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse()
  },
}

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent'
    )
  },
  handle(handlerInput) {
    const speakOutput = 'You can say hello to me! How can I help?'
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse()
  },
}

const RepeatHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
        'AMAZON.RepeatIntent'
    )
  },
  handle(handlerInput) {
    const session = handlerInput.requestEnvelope.session
    const speakOutput = session.attributes.lastResponse
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse()
  },
}

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) ===
        'AMAZON.CancelIntent' ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          'AMAZON.StopIntent')
    )
  },
  handle(handlerInput) {
    const speakOutput = 'Goodbye!'
    return handlerInput.responseBuilder.speak(speakOutput).getResponse()
  },
}

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

// const IntentReflectorHandler = {
//   canHandle(handlerInput) {
//     return (
//       Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
//     )
//   },
//   handle(handlerInput) {
//     const intentName = Alexa.getIntentName(handlerInput.requestEnvelope)
//     const speakOutput = `You just triggered ${intentName}`
//     return (
//       handlerInput.responseBuilder
//         .speak(speakOutput)
//         //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
//         .getResponse()
//     )
//   },
// }

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
  canHandle() {
    return true
  },
  handle(handlerInput, error) {
    console.log(`~~~~ Error handled: ${error.stack}`)
    const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse()
  },
}

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
    addToFridgeHandler,
    removeFromFridgeHandler,
    // getFridgeHandler,
    nextStepHandler,
    // getIngredientHandler,
    AlexaWebConnectionHandler,
    // AnswerIntentHandler,
    AnswerIntentAlexaIdHandler,
    ConfirmCodeHandler,
    findRecipeByIngredientsHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    RepeatHandler,
    SessionEndedRequestHandler
    // IntentReflectorHandler // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
  )
  .addErrorHandlers(ErrorHandler)
  .lambda()
