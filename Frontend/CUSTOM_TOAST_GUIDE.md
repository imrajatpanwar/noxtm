# Custom Toast Implementation Guide

## Overview
This implementation provides a fully custom, headless toast notification system using Sonner, with complete control over styles and JSX while maintaining smooth animations and interactions.

## Files Created

### 1. `CustomToast.js` - Main Component
Contains the Toast component and helper functions for showing different types of toasts.

### 2. `CustomToast.css` - Styling
Modern, animated styles with hover effects, dark mode support, and responsive design.

### 3. `ToastDemo.js` - Demo Component
Example component showing how to trigger custom toasts (for testing).

## Features

✨ **Custom Design** - Full control over toast appearance
🎨 **Avatar Support** - Display user avatars in message toasts
⏰ **Timestamps** - Show when messages were sent
🔘 **Action Buttons** - Interactive buttons with callbacks
🎭 **Animations** - Smooth slide-in and hover effects
🌓 **Dark Mode** - Automatic dark mode support
📱 **Responsive** - Works on mobile and desktop
🎵 **Sound** - Notification sound on new messages

## Usage

### Message Toast (for chat notifications)

```javascript
import { showMessageToast } from './components/CustomToast';

showMessageToast({
  title: 'Team Updates',                    // Conversation or group name
  description: 'Hey! Check this out...',    // Message content
  sender: 'John Doe',                       // Sender's name
  timestamp: new Date().toISOString(),      // Message timestamp
  avatarUrl: 'https://example.com/avatar.jpg', // Profile picture URL
  button: {
    label: 'Reply',
    onClick: () => {
      // Handle reply action
      console.log('Reply clicked');
    }
  }
});
```

### Notification Toast (for system notifications)

```javascript
import { showNotificationToast } from './components/CustomToast';

showNotificationToast({
  title: 'Profile Updated',
  description: 'Your changes have been saved successfully.',
  button: {
    label: 'View',
    onClick: () => {
      // Handle view action
      console.log('View clicked');
    }
  },
  duration: 4000  // Optional: custom duration in ms
});
```

## Integration

### Automatic Integration
The custom toast is already integrated into the MessagingContext:
- New messages automatically trigger custom toasts
- Toast includes sender info, avatar, and reply button
- Clicking "Reply" opens the conversation

### Manual Integration
To use custom toasts in other components:

```javascript
import { showMessageToast, showNotificationToast } from '../components/CustomToast';

function MyComponent() {
  const handleAction = () => {
    showNotificationToast({
      title: 'Success!',
      description: 'Your action was completed.',
      button: {
        label: 'OK',
        onClick: () => console.log('Dismissed')
      }
    });
  };

  return <button onClick={handleAction}>Do Something</button>;
}
```

## Customization

### Modifying Styles
Edit `CustomToast.css` to customize:
- Colors and gradients
- Border radius and shadows
- Animation timing
- Font sizes and weights
- Dark mode colors

### Modifying Layout
Edit `CustomToast.js` to customize:
- Toast structure
- Avatar display logic
- Button behavior
- Additional fields

### Example Customizations

**Change Primary Color:**
```css
.custom-toast-button {
  background: #4299e1; /* Change from #667eea */
}
```

**Add Close Button:**
```javascript
<button onClick={() => sonnerToast.dismiss(id)}>✕</button>
```

**Show Group Icon Instead of Avatar:**
```javascript
{groupIcon ? (
  <img src={groupIcon} alt="Group" />
) : (
  <img src={avatarUrl} alt={sender} />
)}
```

## API Reference

### showMessageToast(options)
Shows a message toast notification.

**Parameters:**
- `title` (string): Main title (conversation name)
- `description` (string): Message content
- `sender` (string): Sender's name
- `timestamp` (string): ISO timestamp
- `avatarUrl` (string): Avatar image URL
- `button` (object): Button configuration
  - `label` (string): Button text
  - `onClick` (function): Click handler

### showNotificationToast(options)
Shows a general notification toast.

**Parameters:**
- `title` (string): Notification title
- `description` (string): Notification message
- `button` (object): Button configuration
  - `label` (string): Button text
  - `onClick` (function): Click handler
- `duration` (number, optional): Auto-dismiss duration in ms (default: 4000)

## Z-Index Configuration

The toast z-index is set to 10000 to ensure it appears above all other elements:

```css
/* In index.css */
[data-sonner-toaster] {
  z-index: 10000 !important;
}
```

This ensures toasts appear above:
- Messaging sidebar (z-index: 50)
- Modals (z-index: 1000-1001)
- All other UI elements

## Events

### messaging:openConversation
Dispatched when the Reply button is clicked in a message toast.

**Event Detail:**
```javascript
{
  conversationId: '123abc...'
}
```

**Listening:**
```javascript
window.addEventListener('messaging:openConversation', (event) => {
  const { conversationId } = event.detail;
  // Handle opening the conversation
});
```

## Testing

Use the `ToastDemo` component to test different toast types:

```javascript
import ToastDemo from './components/ToastDemo';

// In your component
<ToastDemo />
```

Click the buttons to see:
- Message toast with avatar and timestamp
- Notification toast with action button

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Troubleshooting

**Toast not appearing?**
- Check z-index configuration in `index.css`
- Verify Toaster component in `App.js` has proper z-index
- Check browser console for errors

**Avatar not showing?**
- Verify avatarUrl is a valid URL
- Check CORS settings if loading from external domain
- Add fallback image handling

**Sound not playing?**
- Browser autoplay restrictions may prevent sound
- User interaction required before sound can play
- Check audio file is loaded correctly

## Future Enhancements

Potential improvements:
- [ ] Toast grouping (stack similar toasts)
- [ ] Read/unread indicators
- [ ] Swipe to dismiss on mobile
- [ ] Custom toast types (success, error, warning)
- [ ] Toast persistence (save dismissed state)
- [ ] Emoji reactions in toasts
- [ ] Multiple action buttons

## Credits

Based on Sonner toast library with custom headless implementation inspired by modern messaging apps.
