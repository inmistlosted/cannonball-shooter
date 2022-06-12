package cannonball.gamecontroller;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.runners.MockitoJUnitRunner;

import javax.websocket.Session;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.mock;

@RunWith(MockitoJUnitRunner.class)
public class ControllerTest {

    @Test
    public void initClient() {
        Session session = mock(Session.class);
        Controller controller = new Controller(session);
        assertTrue(controller.initClient());
    }

    @Test
    public void handleMessage() throws Exception {
        Session session = mock(Session.class);
        Controller controller = new Controller(session);
        String message = "{\"command\": 100, \"content\": {\"width\": 1, \"height\": 1, \"fps\": 2}}";
        int res = controller.handleMessage(message);
        assertEquals(1, res);
    }

    @Test(expected = Exception.class)
    public void handleMessageExeptionTest() throws Exception {
        Session session = mock(Session.class);
        Controller controller = new Controller(session);
        String wrongMsg = "{\"command\": 404}";
        controller.handleMessage(wrongMsg);
    }

    @Test(expected = NullPointerException.class)
    public void handleMessageNPExeptionTest() throws Exception {
        Session session = mock(Session.class);
        Controller controller = new Controller(session);
        String message = "{\"command\": 200, \"preSharedKey\": \"gdjhd234erw\"}";
        controller.handleMessage(message);
    }

    @Test
    public void closeApp() {
        Session session = mock(Session.class);
        Controller controller = new Controller(session);
        assertTrue(controller.closeApp());
    }
}