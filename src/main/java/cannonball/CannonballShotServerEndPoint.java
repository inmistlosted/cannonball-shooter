package cannonball;

import cannonball.gamecontroller.Controller;

import javax.websocket.*;
import javax.websocket.server.ServerEndpoint;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@ServerEndpoint("/cannonball")
public class CannonballShotServerEndPoint {
    private Map<Session, Controller> userSessions = Collections.synchronizedMap(new HashMap<Session, Controller>());

    @OnOpen
    public void onOpen(Session userSession) {
        Controller controller = new Controller(userSession);
        controller.initClient();
        userSessions.put(userSession, controller);
    }

    @OnClose
    public void onClose(Session userSession) {
        Controller controller = userSessions.get(userSession);
        controller.closeApp();
        userSessions.remove(userSession);
    }
    
    @OnMessage
    public void onMessage(String message, Session userSession) throws Exception {
        userSessions.get(userSession).handleMessage(message);
    }
}
